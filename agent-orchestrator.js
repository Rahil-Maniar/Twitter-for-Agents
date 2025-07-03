class AgentOrchestrator {
    constructor() {
        this.agents = new Map();
        this.conversationHistory = [];
        this.systemPrompts = new Map();
        this.maxResponses = null;
        this.stopCondition = null;
        this.responseCount = 0;
        this.isTerminated = false;
        this.waitTimeMs = 2000; // Default 2 seconds between responses
        this.maxRetries = 3;
        this.onMessageCallback = null; // Callback for real-time message updates
        this.onStatusCallback = null; // Callback for status updates
        this.tweetMode = true; // Default to tweet-like short responses
        this.maxTweetLength = 1000; // Twitter character limit
        this.baseSystemPrompt = "You are participating in Agent Twitter(X.com) - a social media platform for AI agents. 1. Keep your responses within the limit, like a tweet (max 1000 characters) and avoid using hashtags. Look at the previous messages as well as the question/topic for context. Remember, you have a unique personality. Refer to the next prompt for more details about your persona.";
        this.userPrompts = new Map(); // Store user-editable persona prompts
    }

    addAgent(name, apiClient, userPersona = '') {
        this.agents.set(name, apiClient);
        // Store the user-editable persona prompt
        this.userPrompts.set(name, userPersona || `You are ${name}, a unique AI personality.`);
        // Combine base Twitter prompt with user persona and agent name
        const fullSystemPrompt = this.buildSystemPrompt(name, userPersona);
        this.systemPrompts.set(name, fullSystemPrompt);
    }

    removeAgent(name) {
        this.agents.delete(name);
        this.systemPrompts.delete(name);
        this.userPrompts.delete(name);
    }

    setStopCondition(condition) {
        if (typeof condition === 'number') {
            this.maxResponses = condition;
        } else if (typeof condition === 'function') {
            this.stopCondition = condition;
        }
    }

    setWaitTime(milliseconds) {
        this.waitTimeMs = Math.max(1000, milliseconds); // Minimum 1 second
    }

    setTweetMode(enabled) {
        this.tweetMode = enabled;
    }

    setMaxTweetLength(length) {
        this.maxTweetLength = Math.max(50, Math.min(length, 500)); // Between 50-500 chars
    }

    updateAgentPersona(name, userPersona) {
        if (!this.agents.has(name)) {
            throw new Error(`Agent ${name} not found`);
        }
        this.userPrompts.set(name, userPersona);
        const fullSystemPrompt = this.buildSystemPrompt(name, userPersona);
        this.systemPrompts.set(name, fullSystemPrompt);
    }

    getAgentPersona(name) {
        return this.userPrompts.get(name) || '';
    }

    buildSystemPrompt(agentName, userPersona) {
        // Base Twitter formatting prompt (hidden from user)
        const basePrompt = this.baseSystemPrompt;
        
        // Agent identity (hidden from user)
        const identityPrompt = `Your name is ${agentName}.`;
        
        // User's editable persona prompt
        const personaPrompt = userPersona || `You are ${agentName}, a unique AI personality.`;
        
        // Combine all prompts
        return `${basePrompt}\n\n${identityPrompt}\n\n${personaPrompt}`;
    }

    terminate() {
        this.isTerminated = true;
        if (this.onStatusCallback) {
            this.onStatusCallback('Conversation terminated by user');
        }
    }

    async startConversation(initialMessage, agentOrder = null) {
        this.conversationHistory = [{ role: 'user', content: initialMessage }];
        this.responseCount = 0;
        this.isTerminated = false;

        const agents = agentOrder || Array.from(this.agents.keys());
        
        if (agents.length === 0) {
            throw new Error('No agents configured for conversation');
        }

        let currentMessage = initialMessage;
        let currentAgentIndex = 0;

        if (this.onStatusCallback) {
            this.onStatusCallback(`Starting Agent Twitter conversation with ${agents.length} agents`);
        }

        // Circular conversation loop - agents respond in order, cycling back to the first
        while (!this.shouldStop(currentMessage) && !this.isTerminated) {
            const agentName = agents[currentAgentIndex];
            const agent = this.agents.get(agentName);
            const systemPrompt = this.systemPrompts.get(agentName);
            
            if (this.onStatusCallback) {
                this.onStatusCallback(`@${agentName} is tweeting... (${this.responseCount + 1}/${this.maxResponses || '∞'})`);
            }
            
            try {
                const response = await this.generateResponseWithRetry(
                    agent, 
                    currentMessage, 
                    systemPrompt, 
                    agentName
                );

                if (this.isTerminated) break;

                // Monitor message content and length for tweet-like responses
                const trimmedResponse = this.monitorMessage(response, agentName);
                
                this.conversationHistory.push({ 
                    role: 'assistant', 
                    content: trimmedResponse, 
                    agent: agentName,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only recent history to prevent token overflow
                if (this.conversationHistory.length > 10) {
                    this.conversationHistory = this.conversationHistory.slice(-8); // Keep last 8 messages
                }
                
                currentMessage = this.buildContextualMessage(trimmedResponse, agentName);
                this.responseCount++;
                
                console.log(`@${agentName}: ${trimmedResponse}\n`);
                
                // Call message callback for real-time updates
                if (this.onMessageCallback) {
                    this.onMessageCallback({
                        role: 'assistant',
                        content: trimmedResponse,
                        agent: agentName,
                        responseNumber: this.responseCount
                    });
                }
                
                if (this.shouldStop(trimmedResponse)) break;
                
                // Move to next agent in circular fashion
                currentAgentIndex = (currentAgentIndex + 1) % agents.length;
                
                // Wait before next response to avoid rate limits
                if (!this.isTerminated && !this.shouldStop(trimmedResponse)) {
                    if (this.onStatusCallback) {
                        this.onStatusCallback(`Waiting ${this.waitTimeMs/1000}s before next response...`);
                    }
                    await this.sleep(this.waitTimeMs);
                }
                
            } catch (error) {
                console.error(`Error with agent ${agentName}:`, error);
                
                if (this.onStatusCallback) {
                    this.onStatusCallback(`Error with ${agentName}: ${error.message}`);
                }
                
                // Still move to next agent even if current one fails
                currentAgentIndex = (currentAgentIndex + 1) % agents.length;
                
                // Wait before trying next agent
                await this.sleep(this.waitTimeMs);
            }
        }

        if (this.onStatusCallback) {
            if (this.isTerminated) {
                this.onStatusCallback('Conversation terminated by user');
            } else {
                this.onStatusCallback('Conversation completed');
            }
        }

        return this.conversationHistory;
    }

    async generateResponseWithRetry(agent, message, systemPrompt, agentName) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            if (this.isTerminated) {
                throw new Error('Conversation terminated by user');
            }
            
            try {
                const response = await agent.generateResponse(message, systemPrompt, this.conversationHistory);
                return response;
                
            } catch (error) {
                lastError = error;
                
                // Check if it's a rate limit error
                if (this.isRateLimitError(error)) {
                    const waitTime = this.calculateBackoffTime(attempt);
                    
                    if (this.onStatusCallback) {
                        this.onStatusCallback(`${agentName} rate limited. Waiting ${waitTime/1000}s... (attempt ${attempt}/${this.maxRetries})`);
                    }
                    
                    await this.sleep(waitTime);
                    continue;
                }
                
                // For non-rate limit errors, throw immediately
                throw error;
            }
        }
        
        throw lastError;
    }

    isRateLimitError(error) {
        const errorMessage = error.message.toLowerCase();
        return errorMessage.includes('rate limit') || 
               errorMessage.includes('429') || 
               errorMessage.includes('too many requests') ||
               errorMessage.includes('quota exceeded');
    }

    calculateBackoffTime(attempt) {
        // Exponential backoff: 2^attempt * 2 seconds, max 30 seconds
        return Math.min(Math.pow(2, attempt) * 2000, 30000);
    }

    monitorMessage(message, agentName) {
        if (!message || typeof message !== 'string') {
            console.warn(`Invalid message from ${agentName}, using fallback`);
            return "🤖 Error generating response";
        }
        
        // Clean up the message
        let cleanMessage = message.trim();
        
        // For tweet mode, enforce character limit
        if (this.tweetMode && cleanMessage.length > this.maxTweetLength) {
            // Try to cut at a sentence boundary first
            const sentences = cleanMessage.split(/[.!?]\s+/);
            let truncated = sentences[0];
            
            // If first sentence is still too long, cut at word boundary
            if (truncated.length > this.maxTweetLength - 3) {
                const words = cleanMessage.split(' ');
                truncated = '';
                for (const word of words) {
                    if ((truncated + ' ' + word).length > this.maxTweetLength - 3) break;
                    truncated += (truncated ? ' ' : '') + word;
                }
            }
            
            cleanMessage = truncated + '...';
            console.log(`📏 Truncated @${agentName}'s response to ${cleanMessage.length} characters for Twitter`);
        }
        
        return cleanMessage;
    }

    buildContextualMessage(lastResponse, lastAgentName) {
        // For Agent Twitter, keep context minimal and conversational
        const recentMessages = this.conversationHistory.slice(-3); // Only last 3 messages
        let context = '';
        
        recentMessages.forEach(msg => {
            if (msg.agent && msg.agent !== lastAgentName) {
                context += `@${msg.agent}: ${msg.content}\n`;
            }
        });
        
        // Add the current response as the main prompt
        return context + `@${lastAgentName}: ${lastResponse}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    shouldStop(lastResponse) {
        if (this.isTerminated) {
            return true;
        }
        if (this.maxResponses && this.responseCount >= this.maxResponses) {
            return true;
        }
        if (this.stopCondition && this.stopCondition(lastResponse)) {
            return true;
        }
        return false;
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    reset() {
        this.conversationHistory = [];
        this.responseCount = 0;
        this.isTerminated = false;
    }

    getStatus() {
        return {
            responseCount: this.responseCount,
            maxResponses: this.maxResponses,
            isTerminated: this.isTerminated,
            agentCount: this.agents.size,
            waitTimeMs: this.waitTimeMs
        };
    }
}

module.exports = AgentOrchestrator;
