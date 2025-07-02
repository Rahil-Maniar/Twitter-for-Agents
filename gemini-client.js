const { getApiKey, config } = require('./config');

class GeminiClient {
    constructor(apiKey = null, agentName = null) {
        this.apiKey = apiKey || getApiKey('gemini', agentName);
        this.agentName = agentName;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
        
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            console.warn('Warning: Gemini API key not configured. Please set GEMINI_API_KEY environment variable or update config.js');
        }
    }

    async generateResponse(message, systemPrompt = '', conversationHistory = []) {
        const prompt = this.buildPrompt(message, systemPrompt, conversationHistory);
        
        // Add retry logic for rate limiting
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: config.defaults.temperature,
                            maxOutputTokens: Math.max(config.defaults.maxTokens, 2048), // Ensure at least 2048 tokens for Gemini
                        }
                    })
                });

                if (response.status === 429) {
                    // Rate limited - wait before retrying
                    const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    console.log(`Gemini rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                    continue;
                }

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
                }

                const data = await response.json();
                console.log('Gemini API Response:', JSON.stringify(data, null, 2));
                
                // Check if response has expected structure
                if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
                    throw new Error(`Gemini API returned unexpected response structure: ${JSON.stringify(data)}`);
                }
                
                const candidate = data.candidates[0];
                
                // Handle different finish reasons
                if (candidate.finishReason === 'MAX_TOKENS') {
                    throw new Error('Response exceeded maximum token limit. Try reducing the input length or increasing maxOutputTokens.');
                }
                
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error('Response was blocked due to safety filters.');
                }
                
                // Check if content and parts exist
                if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
                    // Provide more detailed error message based on what's missing
                    if (!candidate.content) {
                        throw new Error(`Gemini API response missing content. Finish reason: ${candidate.finishReason}`);
                    } else if (!candidate.content.parts) {
                        throw new Error(`Gemini API response content missing parts. Finish reason: ${candidate.finishReason}`);
                    } else {
                        throw new Error(`Gemini API response has empty parts array. Finish reason: ${candidate.finishReason}`);
                    }
                }
                
                return candidate.content.parts[0].text;
                
            } catch (error) {
                if (retryCount === maxRetries - 1) {
                    throw error;
                }
                retryCount++;
                const waitTime = Math.pow(2, retryCount) * 1000;
                console.log(`Gemini error, retrying in ${waitTime}ms: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    buildPrompt(message, systemPrompt, conversationHistory) {
        let prompt = '';
        
        if (systemPrompt) {
            prompt += `System: ${systemPrompt}\n\n`;
        }
        
        // Add recent conversation context (last 3 messages to avoid token limits)
        const recentHistory = conversationHistory.slice(-3);
        for (const entry of recentHistory) {
            if (entry.agent) {
                prompt += `${entry.agent}: ${entry.content}\n`;
            } else if (entry.role === 'user') {
                prompt += `User: ${entry.content}\n`;
            } else if (entry.role === 'assistant') {
                prompt += `Assistant: ${entry.content}\n`;
            }
        }
        
        prompt += `\nRespond to: ${message}`;
        return prompt;
    }
}

module.exports = GeminiClient;
