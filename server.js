const express = require('express');
const path = require('path');
const cors = require('cors');
const { config, validateApiKeys } = require('./config');

class WebServer {
    constructor(port = null) {
        this.app = express();
        this.port = port || config.server.port;
        this.setupMiddleware();
        this.setupRoutes();
        
        // Log configuration warnings on startup
        const warnings = validateApiKeys();
        if (warnings.length > 0) {
            console.log('\n⚠️  Configuration warnings:');
            warnings.forEach(warning => console.log(`   - ${warning}`));
            console.log('   Please configure your API keys in config.js or set environment variables\n');
        }
    }

    setupMiddleware() {
        // Enable CORS for all routes
        this.app.use(cors());
        
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Serve static files from the current directory
        this.app.use(express.static(__dirname));
        
        // Log requests
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
            next();
        });
    }

    setupRoutes() {
        // Serve the main page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // API endpoint for testing agent connections and running conversations
        this.app.post('/api/test-agent', async (req, res) => {
            try {
                const { agentType, systemPrompt, message, conversationHistory, agentName } = req.body;

                let client;
                if (agentType === 'gemini') {
                    const GeminiClient = require('./gemini-client');
                    client = new GeminiClient(null, agentName); // Pass agent name for key rotation
                } else if (agentType === 'claude') {
                    const ClaudeClient = require('./claude-client');
                    client = new ClaudeClient(); // Use environment API key
                } else {
                    return res.status(400).json({ error: 'Invalid agent type. Supported types: gemini, claude' });
                }

                // Use the provided message or a default test message
                const messageToSend = message || 'Hello! Please respond with just "Connection successful" to confirm the API is working.';
                const history = conversationHistory || [];
                const response = await client.generateResponse(messageToSend, systemPrompt || '', history);
                
                res.json({ 
                    success: true, 
                    message: message ? 'Response generated successfully' : 'Agent connection successful',
                    response: response
                });
            } catch (error) {
                console.error('Agent test error:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // API key statistics endpoint (for debugging)
        this.app.get('/api/key-stats', (req, res) => {
            const { getApiKeyStats } = require('./config');
            res.json(getApiKeyStats());
        });

        // Handle 404s
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    start() {
        return new Promise((resolve, reject) => {
            const server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🚀 Agent Twitter is running at http://localhost:${this.port}`);
                    console.log(`📱 Open your browser and navigate to the URL above to get started!`);
                    resolve(server);
                }
            });
        });
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new WebServer();
    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = WebServer;
