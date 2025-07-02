const { getApiKey, config } = require('./config');

class ClaudeClient {
    constructor(apiKey = null) {
        this.apiKey = apiKey || getApiKey('claude');
        this.baseUrl = 'https://api.anthropic.com/v1/messages';
        
        if (!this.apiKey || this.apiKey === 'YOUR_CLAUDE_API_KEY_HERE') {
            console.warn('Warning: Claude API key not configured. Please set CLAUDE_API_KEY environment variable or update config.js');
        }
    }

    async generateResponse(message, systemPrompt = '', conversationHistory = []) {
        // Validate API key format
        if (!this.apiKey || !this.apiKey.startsWith('sk-ant-')) {
            throw new Error('Invalid Claude API key format. Key should start with "sk-ant-" and be complete.');
        }
        
        // Check for invalid characters (like ellipsis)
        if (this.apiKey.includes('…') || this.apiKey.includes('...')) {
            throw new Error('Claude API key contains invalid characters. Please provide the complete key without ellipsis.');
        }
        
        const messages = this.buildMessages(message, conversationHistory);
        
        // Add retry logic for rate limiting
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const response = await fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-sonnet-20240229',
                        max_tokens: config.defaults.maxTokens,
                        temperature: config.defaults.temperature,
                        system: systemPrompt || undefined,
                        messages: messages
                    })
                });

                if (response.status === 429) {
                    // Rate limited - wait before retrying
                    const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    console.log(`Claude rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                    continue;
                }

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Claude API error: ${response.status} - ${errorData}`);
                }

                const data = await response.json();
                return data.content[0].text;
                
            } catch (error) {
                if (retryCount === maxRetries - 1) {
                    throw error;
                }
                retryCount++;
                const waitTime = Math.pow(2, retryCount) * 1000;
                console.log(`Claude error, retrying in ${waitTime}ms: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    buildMessages(message, conversationHistory) {
        const messages = [];
        
        // Add recent conversation context (last 3 messages to avoid token limits)
        const recentHistory = conversationHistory.slice(-3);
        for (const entry of recentHistory) {
            if (entry.role === 'assistant' || entry.agent) {
                messages.push({
                    role: 'assistant',
                    content: entry.content
                });
            } else if (entry.role === 'user') {
                messages.push({
                    role: 'user',
                    content: entry.content
                });
            }
        }
        
        messages.push({
            role: 'user',
            content: message
        });
        
        return messages;
    }
}

module.exports = ClaudeClient;
