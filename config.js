// Load environment variables from .env file
require('dotenv').config();

// Configuration file for API keys and settings
// NOTE: In production, these should be environment variables or stored securely

const config = {
    // API Keys - Replace with your actual keys
    apiKeys: {
        // Parse multiple Gemini keys separated by commas
        gemini: process.env.GEMINI_API_KEY ? 
            process.env.GEMINI_API_KEY.split(',').map(key => key.trim()).filter(key => key) : 
            ['YOUR_GEMINI_API_KEY_HERE'],
        claude: process.env.CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY_HERE'
    },
    
    // Default settings
    defaults: {
        maxResponses: 6,
        temperature: 0.7,
        maxTokens: 4096  // Increased to 4096 to avoid MAX_TOKENS errors
    },
    
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    }
};

// Validation function to check if API keys are configured
function validateApiKeys() {
    const warnings = [];
    
    const geminiKeys = config.apiKeys.gemini;
    if (!geminiKeys || geminiKeys.length === 0 || 
        (geminiKeys.length === 1 && geminiKeys[0] === 'YOUR_GEMINI_API_KEY_HERE')) {
        warnings.push('Gemini API key is not configured');
    } else {
        console.log(`✅ Found ${geminiKeys.length} Gemini API key(s)`);
    }
    
    if (!config.apiKeys.claude || config.apiKeys.claude === 'YOUR_CLAUDE_API_KEY_HERE') {
        warnings.push('Claude API key is not configured');
    }
    
    return warnings;
}

// Counter for round-robin key rotation
let geminiKeyIndex = 0;
// Map to store agent-specific key assignments
const agentKeyAssignments = new Map();

// Function to get API key for a specific service
function getApiKey(service, agentName = null) {
    if (service.toLowerCase() === 'gemini') {
        const keys = config.apiKeys.gemini;
        if (Array.isArray(keys) && keys.length > 0) {
            
            // If agent name is provided, try to use consistent key assignment
            if (agentName && keys.length > 1) {
                if (!agentKeyAssignments.has(agentName)) {
                    // Assign a key based on agent name hash for consistency
                    const hash = agentName.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0);
                        return a & a;
                    }, 0);
                    const keyIndex = Math.abs(hash) % keys.length;
                    agentKeyAssignments.set(agentName, keyIndex);
                    console.log(`🔑 Assigned Gemini API key #${keyIndex + 1} to agent: ${agentName}`);
                }
                return keys[agentKeyAssignments.get(agentName)];
            }
            
            // Otherwise, use round-robin rotation
            const key = keys[geminiKeyIndex % keys.length];
            geminiKeyIndex = (geminiKeyIndex + 1) % keys.length;
            
            if (agentName) {
                console.log(`🔄 Using Gemini API key #${(geminiKeyIndex === 0 ? keys.length : geminiKeyIndex)} for agent: ${agentName} (round-robin)`);
            }
            
            return key;
        }
        return keys[0] || 'YOUR_GEMINI_API_KEY_HERE';
    }
    
    return config.apiKeys[service.toLowerCase()];
}

// Function to get a specific API key by index (for agent-specific assignment)
function getApiKeyByIndex(service, index) {
    if (service.toLowerCase() === 'gemini') {
        const keys = config.apiKeys.gemini;
        if (Array.isArray(keys) && keys.length > 0) {
            return keys[index % keys.length];
        }
        return keys[0] || 'YOUR_GEMINI_API_KEY_HERE';
    }
    
    return config.apiKeys[service.toLowerCase()];
}

// Function to check if a service is available
function isServiceAvailable(service) {
    if (service.toLowerCase() === 'gemini') {
        const keys = config.apiKeys.gemini;
        return Array.isArray(keys) && keys.length > 0 && 
               !(keys.length === 1 && keys[0] === 'YOUR_GEMINI_API_KEY_HERE');
    }
    
    const key = getApiKey(service);
    return key && key !== `YOUR_${service.toUpperCase()}_API_KEY_HERE`;
}

// Function to get API key usage statistics
function getApiKeyStats() {
    const geminiKeys = config.apiKeys.gemini;
    const stats = {
        gemini: {
            totalKeys: Array.isArray(geminiKeys) ? geminiKeys.length : 1,
            currentRoundRobinIndex: geminiKeyIndex,
            agentAssignments: Object.fromEntries(agentKeyAssignments)
        },
        claude: {
            totalKeys: 1,
            configured: config.apiKeys.claude !== 'YOUR_CLAUDE_API_KEY_HERE'
        }
    };
    return stats;
}

// Function to reset key assignments (useful for testing)
function resetKeyAssignments() {
    agentKeyAssignments.clear();
    geminiKeyIndex = 0;
    console.log('🔄 API key assignments reset');
}

module.exports = {
    config,
    validateApiKeys,
    getApiKey,
    getApiKeyByIndex,
    isServiceAvailable,
    getApiKeyStats,
    resetKeyAssignments
};
