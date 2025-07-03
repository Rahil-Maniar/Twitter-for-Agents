// Browser-compatible UI Controller
// Note: This runs in the browser, so we can't use Node.js require()

class UIController {
    constructor() {
        this.customAgents = new Map(); // Store custom agent configurations
        this.conversationFlow = []; // Array of agent names for conversation order
        this.isConversationRunning = false;
        this.conversationHistory = [];
        this.orchestrator = null; // Agent orchestrator instance
        
        this.initializeUI();
        this.initializeEventListeners();
        this.loadConfiguration();
        this.renderAgentsList();
        this.updateFlowDisplay();
    }

    initializeUI() {
        // Initialize agent type dropdown
        const agentTypeSelect = document.getElementById('new-agent-type');
        if (agentTypeSelect && agentTypeSelect.children.length === 0) {
            agentTypeSelect.innerHTML = `
                <option value="gemini">Gemini</option>
                <option value="claude">Claude</option>
            `;
        }

        // Initialize flow controls if they don't exist
        const flowControls = document.querySelector('.flow-controls');
        if (flowControls && !document.getElementById('clear-flow')) {
            flowControls.innerHTML = `
                <button id="clear-flow" class="btn btn-secondary btn-small">Clear Flow</button>
                <button id="randomize-flow" class="btn btn-secondary btn-small">Randomize</button>
            `;
        }

        // Initialize chat controls
        const chatControls = document.querySelector('.chat-input-container .chat-controls');
        if (chatControls && !document.getElementById('send-message')) {
            chatControls.innerHTML = `
                <button id="send-message" class="btn btn-primary" disabled>Start Conversation</button>
                <button id="terminate-conversation" class="btn" style="display: none;">Terminate</button>
            `;
        }
    }

    initializeEventListeners() {
        // Helper function to safely add event listeners
        const safeAddEventListener = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        };

        // Agent management events
        safeAddEventListener('add-agent', 'click', () => this.addAgent());
        safeAddEventListener('new-agent-name', 'keypress', (e) => {
            if (e.key === 'Enter') this.addAgent();
        });
        
        // Flow management events
        safeAddEventListener('clear-flow', 'click', () => this.clearFlow());
        safeAddEventListener('randomize-flow', 'click', () => this.randomizeFlow());
        
        // Configuration events
        safeAddEventListener('save-config', 'click', () => this.saveConfiguration());
        
        // Chat events (these might be created dynamically)
        setTimeout(() => {
            safeAddEventListener('send-message', 'click', () => this.startConversation());
            safeAddEventListener('terminate-conversation', 'click', () => this.terminateConversation());
            safeAddEventListener('clear-chat', 'click', () => this.clearChat());
            safeAddEventListener('export-chat', 'click', () => this.exportChat());
            
            // Input events
            safeAddEventListener('message-input', 'keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.startConversation();
                }
            });
            
            safeAddEventListener('message-input', 'input', () => this.updateSendButton());
        }, 100);
        
        // Flow drag and drop
        this.setupFlowDragAndDrop();
    }

    setupFlowDragAndDrop() {
        const flowContainer = document.getElementById('conversation-flow');
        
        flowContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            flowContainer.classList.add('dragover');
        });
        
        flowContainer.addEventListener('dragleave', (e) => {
            if (!flowContainer.contains(e.relatedTarget)) {
                flowContainer.classList.remove('dragover');
            }
        });
        
        flowContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            flowContainer.classList.remove('dragover');
            // Handle reordering logic here
        });
    }

    addAgent() {
        const nameInput = document.getElementById('new-agent-name');
        const typeSelect = document.getElementById('new-agent-type');
        
        const name = nameInput.value.trim();
        const type = typeSelect.value;
        
        if (!name) {
            this.showStatus('Please enter an agent name', 'warning');
            return;
        }
        
        if (this.customAgents.has(name)) {
            this.showStatus('Agent with this name already exists', 'warning');
            return;
        }
        
        // Create default system prompt based on type (All agents get the same Twitter-style prompt)
        const defaultPersonas = {
            gemini: `You are a creative and innovative AI assistant. You love brainstorming ideas, making clever jokes, and thinking outside the box. You're optimistic and energetic.`,
            claude: `You are a thoughtful and analytical AI assistant. You enjoy deep discussions, providing well-reasoned responses, and helping solve complex problems. You're careful and precise.`
        };
        
        this.customAgents.set(name, {
            type: type,
            systemPrompt: defaultPersonas[type], // This is now the user-editable persona
            isActive: true
        });
        
        nameInput.value = '';
        this.renderAgentsList();
        this.updateStatus();
        this.showStatus(`Agent "${name}" added successfully!`, 'success');
    }

    removeAgent(agentName) {
        if (confirm(`Are you sure you want to remove agent "${agentName}"?`)) {
            this.customAgents.delete(agentName);
            this.conversationFlow = this.conversationFlow.filter(name => name !== agentName);
            this.renderAgentsList();
            this.updateFlowDisplay();
            this.updateStatus();
            this.showStatus(`Agent "${agentName}" removed`, 'success');
        }
    }

    editAgent(agentName) {
        const agent = this.customAgents.get(agentName);
        if (!agent) return;
        
        this.showEditModal(agentName, agent);
    }

    showEditModal(agentName, agent) {
        const modalHTML = `
            <div class="modal-overlay" id="edit-modal">
                <div class="modal">
                    <h3>Edit Agent: ${agentName}</h3>
                    <div class="input-group">
                        <label for="edit-agent-type">Agent Type:</label>
                        <select id="edit-agent-type">
                            <option value="gemini" ${agent.type === 'gemini' ? 'selected' : ''}>Gemini</option>
                            <option value="claude" ${agent.type === 'claude' ? 'selected' : ''}>Claude</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="edit-system-prompt">Agent Persona:</label>
                        <textarea id="edit-system-prompt" rows="6" placeholder="Describe this agent's personality, role, and behavior style...">${agent.systemPrompt}</textarea>
                        <small style="color: #666; font-size: 0.9em; margin-top: 5px; display: block;">
                            💡 Tip: This defines your agent's personality. The Twitter formatting rules are handled automatically!
                        </small>
                    </div>
                    <div class="modal-buttons">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="uiController.saveAgentEdit('${agentName}')">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    saveAgentEdit(agentName) {
        const type = document.getElementById('edit-agent-type').value;
        const systemPrompt = document.getElementById('edit-system-prompt').value;
        
        this.customAgents.set(agentName, {
            type: type,
            systemPrompt: systemPrompt,
            isActive: true
        });
        
        document.getElementById('edit-modal').remove();
        this.renderAgentsList();
        this.updateStatus();
        this.showStatus(`Agent "${agentName}" updated successfully!`, 'success');
    }

    addToFlow(agentName) {
        if (!this.conversationFlow.includes(agentName)) {
            this.conversationFlow.push(agentName);
            this.updateFlowDisplay();
            this.updateStatus();
            this.showStatus(`Added "${agentName}" to conversation flow`, 'success');
        } else {
            this.showStatus(`"${agentName}" is already in the flow`, 'warning');
        }
    }

    removeFromFlow(agentName) {
        this.conversationFlow = this.conversationFlow.filter(name => name !== agentName);
        this.updateFlowDisplay();
        this.updateStatus();
    }

    clearFlow() {
        this.conversationFlow = [];
        this.updateFlowDisplay();
        this.updateStatus();
    }

    randomizeFlow() {
        const availableAgents = Array.from(this.customAgents.keys());
        if (availableAgents.length === 0) {
            this.showStatus('No agents available to randomize', 'warning');
            return;
        }
        
        // Fisher-Yates shuffle
        for (let i = availableAgents.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableAgents[i], availableAgents[j]] = [availableAgents[j], availableAgents[i]];
        }
        
        this.conversationFlow = availableAgents;
        this.updateFlowDisplay();
        this.updateStatus();
        this.showStatus('Flow randomized!', 'success');
    }

    renderAgentsList() {
        const agentsList = document.getElementById('agents-list');
        
        if (this.customAgents.size === 0) {
            agentsList.innerHTML = '<div class="flow-placeholder">No agents configured</div>';
            return;
        }
        
        const agentsHTML = Array.from(this.customAgents.entries()).map(([name, agent]) => `
            <div class="agent-item">
                <div class="agent-info">
                    <div class="agent-name">
                        ${name}
                        <span class="agent-type-badge ${agent.type}">${agent.type}</span>
                    </div>
                    <div class="agent-prompt">
                        <strong>Persona:</strong> ${agent.systemPrompt.length > 100 ? agent.systemPrompt.substring(0, 100) + '...' : agent.systemPrompt}
                    </div>
                </div>
                <div class="agent-controls">
                    <button class="btn-icon add-to-flow" onclick="uiController.addToFlow('${name}')" title="Add to Flow">
                        ➕
                    </button>
                    <button class="btn-icon edit" onclick="uiController.editAgent('${name}')" title="Edit">
                        ✏️
                    </button>
                    <button class="btn-icon delete" onclick="uiController.removeAgent('${name}')" title="Remove">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
        
        agentsList.innerHTML = agentsHTML;
    }

    updateFlowDisplay() {
        const flowContainer = document.getElementById('conversation-flow');
        
        if (this.conversationFlow.length === 0) {
            flowContainer.innerHTML = '<div class="flow-placeholder">Add agents to create a conversation flow</div>';
            return;
        }
        
        const flowHTML = this.conversationFlow.map((agentName, index) => {
            const agent = this.customAgents.get(agentName);
            const isLast = index === this.conversationFlow.length - 1;
            
            return `
                <span class="flow-item" draggable="true" data-agent="${agentName}">
                    ${agentName}
                    <button class="remove-from-flow" onclick="uiController.removeFromFlow('${agentName}')" title="Remove from flow">×</button>
                </span>
                ${!isLast ? '<span class="flow-arrow">→</span>' : ''}
            `;
        }).join('');
        
        flowContainer.innerHTML = flowHTML;
    }

    loadConfiguration() {
        // Load saved configuration from localStorage
        const savedConfig = localStorage.getItem('agent-orchestrator-config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                
                if (config.maxResponses) {
                    document.getElementById('max-responses').value = config.maxResponses;
                }
                if (config.stopKeyword) {
                    document.getElementById('stop-keyword').value = config.stopKeyword;
                }
                if (config.waitTime) {
                    document.getElementById('wait-time').value = config.waitTime;
                }
                if (config.customAgents) {
                    this.customAgents = new Map(Object.entries(config.customAgents));
                }
                if (config.conversationFlow) {
                    this.conversationFlow = config.conversationFlow;
                }
                
                this.renderAgentsList();
                this.updateFlowDisplay();
                this.updateStatus();
            } catch (error) {
                console.error('Error loading configuration:', error);
            }
        }
    }

    saveConfiguration() {
        const config = {
            maxResponses: document.getElementById('max-responses').value,
            stopKeyword: document.getElementById('stop-keyword').value,
            waitTime: document.getElementById('wait-time').value,
            customAgents: Object.fromEntries(this.customAgents),
            conversationFlow: this.conversationFlow
        };
        
        localStorage.setItem('agent-orchestrator-config', JSON.stringify(config));
        this.showStatus('Configuration saved successfully!', 'success');
    }

    updateStatus() {
        // Count active agents by type  
        let totalConfigured = this.customAgents.size;
        
        // Update status indicators
        const agentsCount = document.getElementById('agents-count');
        const flowStatus = document.getElementById('flow-status');
        
        agentsCount.textContent = totalConfigured > 0 ? 
            `🟢 ${totalConfigured} configured` : 
            '⚫ No agents configured';
        
        flowStatus.textContent = this.conversationFlow.length > 0 ?
            `🟢 ${this.conversationFlow.length} agents in flow` :
            '⚫ No flow set';
        
        this.updateSendButton();
    }

    updateSendButton() {
        const sendButton = document.getElementById('send-message');
        const messageInput = document.getElementById('message-input');
        
        const hasMessage = messageInput.value.trim().length > 0;
        const hasConfiguredAgents = this.customAgents.size > 0;
        const hasFlow = this.conversationFlow.length > 0;
        const isReady = hasMessage && hasConfiguredAgents && hasFlow && !this.isConversationRunning;
        
        sendButton.disabled = !isReady;
        sendButton.textContent = this.isConversationRunning ? 'Running...' : 'Start Conversation';
    }

    async startConversation() {
        if (this.isConversationRunning) return;
        
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        if (this.conversationFlow.length === 0) {
            this.showStatus('Please set up a conversation flow first', 'warning');
            return;
        }
        
        this.isConversationRunning = true;
        this.updateSendButton();
        this.updateConversationStatus('🔄 Starting conversation...');
        
        // Show terminate button
        const terminateButton = document.getElementById('terminate-conversation');
        if (terminateButton) {
            terminateButton.style.display = 'inline-block';
        }
        
        // Add user message to chat
        this.addMessageToChat('user', message, 'You');
        
        // Clear input
        messageInput.value = '';
        
        try {
            await this.runConversationWithAPI(message);
            this.updateConversationStatus('✅ Conversation completed');
        } catch (error) {
            console.error('Conversation error:', error);
            this.addMessageToChat('system', `Error: ${error.message}`, 'System');
            this.updateConversationStatus('❌ Conversation failed');
        } finally {
            this.isConversationRunning = false;
            this.updateSendButton();
            // Hide terminate button
            if (terminateButton) {
                terminateButton.style.display = 'none';
            }
        }
    }

    terminateConversation() {
        if (this.orchestrator) {
            this.orchestrator.terminate();
        }
        this.isConversationRunning = false;
        this.updateSendButton();
        this.updateConversationStatus('🛑 Conversation terminated by user');
        
        const terminateButton = document.getElementById('terminate-conversation');
        if (terminateButton) {
            terminateButton.style.display = 'none';
        }
    }

    async runConversationWithAPI(initialMessage) {
        const maxResponses = parseInt(document.getElementById('max-responses').value) || 6;
        const stopKeyword = document.getElementById('stop-keyword').value.trim();
        const waitTime = parseInt(document.getElementById('wait-time').value) || 3000;
        
        // Initialize conversation history with the user's message
        this.conversationHistory = [{ role: 'user', content: initialMessage }];
        
        let currentMessage = initialMessage;
        let responseCount = 0;
        let currentAgentIndex = 0;
        
        // Create orchestrator with callbacks
        this.orchestrator = {
            isTerminated: false,
            terminate: () => { this.orchestrator.isTerminated = true; }
        };
        
        // Circular conversation loop - agents respond in order, cycling back to the first
        while (responseCount < maxResponses && !this.orchestrator.isTerminated) {
            if (this.conversationFlow.length === 0) break;
            
            const agentName = this.conversationFlow[currentAgentIndex];
            const agent = this.customAgents.get(agentName);
            
            if (!agent) {
                // Move to next agent if current one doesn't exist
                currentAgentIndex = (currentAgentIndex + 1) % this.conversationFlow.length;
                continue;
            }
            
            this.updateConversationStatus(`🤖 ${agentName} is thinking... (${responseCount + 1}/${maxResponses})`);
            
            try {
                // Build the complete system prompt (base Twitter rules + agent identity + user persona)
                const fullSystemPrompt = this.buildFullSystemPrompt(agentName, agent.systemPrompt);
                const response = await this.callAgentAPIWithRetry(agent.type, currentMessage, fullSystemPrompt, agentName);
                
                if (this.orchestrator.isTerminated) break;
                
                // Monitor message length
                const trimmedResponse = this.monitorMessage(response, agentName);
                
                this.addMessageToChat('assistant', trimmedResponse, agentName, agent.type);
                
                // Update conversation history
                this.conversationHistory.push({ 
                    role: 'assistant', 
                    content: trimmedResponse, 
                    agent: agentName 
                });
                
                currentMessage = trimmedResponse;
                responseCount++;
                
                // Check stop keyword
                if (stopKeyword && trimmedResponse.toLowerCase().includes(stopKeyword.toLowerCase())) {
                    this.addMessageToChat('system', `Conversation stopped due to keyword: "${stopKeyword}"`, 'System');
                    break;
                }
                
                // Move to next agent in circular fashion
                currentAgentIndex = (currentAgentIndex + 1) % this.conversationFlow.length;
                
                // Wait before next response
                if (responseCount < maxResponses && !this.orchestrator.isTerminated) {
                    this.updateConversationStatus(`⏳ Waiting ${waitTime/1000}s before next response...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                
            } catch (error) {
                console.error(`Error with agent ${agentName}:`, error);
                this.addMessageToChat('system', `❌ Error with ${agentName}: ${error.message}`, 'System');
                
                // Move to next agent even if current one fails
                currentAgentIndex = (currentAgentIndex + 1) % this.conversationFlow.length;
                
                // Wait before trying next agent
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        if (this.orchestrator.isTerminated) {
            this.addMessageToChat('system', '🛑 Conversation terminated by user', 'System');
        }
    }

    monitorMessage(message, agentName) {
        const maxLength = 1000; // Twitter character limit
        
        if (!message || typeof message !== 'string') {
            console.warn(`Invalid message from ${agentName}, using fallback`);
            return "🤖 Error generating response";
        }
        
        // Clean up the message
        let cleanMessage = message.trim();
        
        // Enforce character limit
        if (cleanMessage.length > maxLength) {
            // Try to cut at a sentence boundary first
            const sentences = cleanMessage.split(/[.!?]\s+/);
            let truncated = sentences[0];
            
            // If first sentence is still too long, cut at word boundary
            if (truncated.length > maxLength - 3) {
                const words = cleanMessage.split(' ');
                truncated = '';
                for (const word of words) {
                    if ((truncated + ' ' + word).length > maxLength - 3) break;
                    truncated += (truncated ? ' ' : '') + word;
                }
            }
            
            cleanMessage = truncated + '...';
            console.log(`📏 Truncated @${agentName}'s response to ${cleanMessage.length} characters for Twitter`);
        }
        
        return cleanMessage;
    }

    buildFullSystemPrompt(agentName, userPersona) {
        // Base Twitter formatting rules (hidden from user)
        const basePrompt = "You are participating in Agent Twitter - a social media platform for AI agents. Keep your responses SHORT and engaging, like a tweet (max 1000 characters). Be conversational, witty, and to the point. Use emojis occasionally. Don't explain yourself - just respond naturally and briefly.";
        
        // Agent identity (hidden from user)
        const identityPrompt = `Your name is ${agentName}.`;
        
        // User's editable persona prompt
        const personaPrompt = userPersona || `You are ${agentName}, a unique AI personality.`;
        
        // Combine all prompts
        return `${basePrompt}\n\n${identityPrompt}\n\n${personaPrompt}`;
    }

    async callAgentAPIWithRetry(agentType, message, systemPrompt, agentName) {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            if (this.orchestrator && this.orchestrator.isTerminated) {
                throw new Error('Conversation terminated by user');
            }
            
            try {
                return await this.callAgentAPI(agentType, '', message, systemPrompt, agentName);
                
            } catch (error) {
                lastError = error;
                
                // Check if it's a rate limit error
                if (this.isRateLimitError(error)) {
                    const waitTime = Math.min(Math.pow(2, attempt) * 2000, 30000); // Exponential backoff, max 30s
                    
                    this.updateConversationStatus(`⏳ ${agentName} rate limited. Waiting ${waitTime/1000}s... (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
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

    async callAgentAPI(agentType, apiKey, message, systemPrompt, agentName = null) {
        const response = await fetch('/api/test-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agentType: agentType,
                systemPrompt: systemPrompt,
                message: message,
                conversationHistory: this.conversationHistory,
                agentName: agentName
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API call failed');
        }

        const data = await response.json();
        return data.response;
    }

    addMessageToChat(role, content, sender, agentType = null) {
        const chatMessages = document.getElementById('chat-messages');
        
        // Remove welcome message if it exists
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        if (agentType) {
            messageDiv.classList.add(agentType);
        }
        
        let messageHTML = '';
        
        if (role !== 'user') {
            const agentConfig = this.customAgents.get(sender);
            const agentBadge = agentConfig ? 
                `<span class="agent-badge">${agentConfig.type}</span>` : '';
            
            messageHTML += `
                <div class="message-header">
                    ${agentType ? `<div class="agent-icon ${agentType}"></div>` : ''}
                    <span>${sender}</span>
                    ${agentBadge}
                </div>
            `;
        }
        
        messageHTML += `<div class="message-content">${this.formatMessage(content)}</div>`;
        messageDiv.innerHTML = messageHTML;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    formatMessage(text) {
        // Simple text formatting - convert newlines to breaks and handle basic markdown
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to Agent Orchestrator!</h3>
                <p>Configure your agents, set up a conversation flow, and start multi-agent conversations.</p>
            </div>
        `;
        
        if (this.orchestrator) {
            this.orchestrator.reset();
        }
        this.conversationHistory = [];
        this.updateConversationStatus('⚫ Ready');
    }

    exportChat() {
        const history = this.orchestrator ? this.orchestrator.getConversationHistory() : this.conversationHistory;
        if (history.length === 0) {
            this.showStatus('No conversation to export', 'warning');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            configuration: {
                maxResponses: document.getElementById('max-responses').value,
                stopKeyword: document.getElementById('stop-keyword').value,
                conversationFlow: this.conversationFlow,
                agents: Object.fromEntries(this.customAgents)
            },
            conversation: history
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-conversation-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus('Conversation exported successfully!', 'success');
    }

    updateConversationStatus(status) {
        const statusElement = document.getElementById('conversation-status');
        const statusIndicator = document.getElementById('conversation-status-indicator');
        
        if (statusElement) statusElement.textContent = status;
        if (statusIndicator) statusIndicator.textContent = status;
    }

    showStatus(message, type = 'info') {
        // Create a temporary status message
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: fadeInUp 0.3s ease;
        `;
        
        if (type === 'success') {
            statusDiv.style.background = '#28a745';
        } else if (type === 'warning') {
            statusDiv.style.background = '#ffc107';
            statusDiv.style.color = '#333';
        } else if (type === 'error') {
            statusDiv.style.background = '#dc3545';
        } else {
            statusDiv.style.background = '#17a2b8';
        }
        
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.parentNode.removeChild(statusDiv);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the UI controller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController();
});

// For Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
