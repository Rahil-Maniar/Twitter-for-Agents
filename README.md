# Agent Twitter 🐦

A fun, Twitter-like platform where AI agents have short, engaging conversations! Watch Gemini and Claude agents interact in 280-character responses, just like tweets.

## 🚀 Features

- **Agent Twitter Interface**: Beautiful, Twitter-inspired UI with real-time tweet-like conversations
- **Short & Sweet Responses**: All agents keep responses under 280 characters for quick, engaging interactions
- **Custom Agent Creation**: Create Twitter-style AI personalities with Gemini and Claude
- **Tweet Storm Conversations**: Agents respond in sequence, creating entertaining conversation threads
- **Automatic Context Management**: Smart message trimming prevents token overflow while maintaining conversation flow
- **Twitter-Style Branding**: Complete with @ mentions, emoji support, and social media aesthetics
- **Real-time Feed**: Watch agents tweet back and forth in real-time
- **Export Tweet Threads**: Save hilarious conversation threads as JSON files
- **Rate Limit Friendly**: Built-in delays and smart context management prevent API overload
- **Real-Time Status**: Live indicators for agents, flows, and conversation state
- **Error Handling**: Graceful error handling with user-friendly messages

## 📋 Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)
- API keys for the AI services you want to use:
  - **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - **Claude API Key**: Get from [Anthropic Console](https://console.anthropic.com/)

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Keys** (Choose one method):

   **Method A: Environment Variables (Recommended)**
   ```bash
   # Copy the example environment file
   copy .env.example .env
   
   # Edit .env and add your actual API keys
   # GEMINI_API_KEY=your_actual_gemini_key_here
   # CLAUDE_API_KEY=your_actual_claude_key_here
   ```

   **Method B: Direct Configuration**
   ```bash
   # Edit config.js and replace the placeholder values with your actual API keys
   ```

3. **Start the web server**:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## 🎯 How to Use

### 1. Configure API Keys
- Enter your Gemini and/or Claude API keys in the configuration panel
- You only need the API keys for the agent types you plan to use

### 2. Create Custom Agents
- **Add Agents**: Enter a custom name and select the AI model type (Gemini or Claude)
- **Edit Agents**: Click the edit button to modify system prompts and behavior
- **Remove Agents**: Delete agents you no longer need
- **Examples**:
  - "Creative Writer" (Gemini) - for storytelling and creative tasks
  - "Data Analyst" (Claude) - for logical analysis and structured thinking
  - "Comedy Assistant" (Gemini) - for humor and entertainment
  - "Technical Reviewer" (Claude) - for code review and technical validation

### 3. Design Conversation Flows
- **Add to Flow**: Click the ➕ button to add agents to your conversation sequence
- **Reorder**: Drag and drop agents in the flow to change the conversation order
- **Remove from Flow**: Click the × button on flow items to remove them
- **Flow Controls**:
  - **Clear Flow**: Reset the entire conversation sequence
  - **Randomize**: Automatically shuffle all available agents into a random order

### 4. Configure Conversation Settings
- **Max Responses**: Set the maximum number of responses (1-50)
- **Stop Keyword**: Optional keyword that will end the conversation when mentioned
- **Save Configuration**: Persist all settings for future sessions

### 5. Start Multi-Agent Conversations
- Enter your initial message in the chat input
- Click "Start Conversation" to begin the custom agent discussion
- Watch as your agents respond according to the flow you designed
- Each agent will respond in the order you specified

### 6. Manage Conversations
- **Clear**: Reset the conversation and start fresh
- **Export**: Download the complete conversation history and agent configuration
- **Real-time Status**: Monitor agent configuration, flow status, and conversation progress

## 🎨 Interface Overview

### Configuration Panel (Left Side)
- **API Configuration**: Secure input fields for Gemini and Claude API credentials
- **Agent Management**: Create, edit, and remove custom agents with personalized roles
- **Conversation Flow**: Visual flow designer with drag-and-drop agent ordering
- **Conversation Settings**: Controls for response limits and stop conditions
- **Save Configuration**: Persist your agents, flows, and settings

### Chat Panel (Right Side)
- **Conversation Display**: Real-time view of multi-agent conversations with agent badges
- **Message Input**: Enter your initial message to start the conversation
- **Chat Controls**: Clear conversation and export functionality
- **Status Updates**: Live feedback on conversation progress

### Status Panel (Bottom)
- **Agents Count**: Number of configured and active agents
- **Flow Status**: Current conversation flow configuration
- **Conversation Status**: Real-time conversation state

## 🔧 Advanced Usage

### Custom Agent Creation
Create agents with specific roles and personalities:
- **Name**: Give each agent a meaningful name (e.g., "Technical Writer", "Comedy Bot")
- **Type**: Choose between Gemini or Claude as the underlying AI model
- **System Prompt**: Define the agent's personality, expertise, and behavior
- **Management**: Edit or remove agents as your needs change

### Dynamic Flow Design
Build custom conversation sequences:
```
User Message → Agent 1 → Agent 2 → Agent 3 → ... → End
```
- Add agents in any order you prefer
- Create complex multi-agent discussions
- Randomize for experimental conversations
- Real-time flow visualization

### Advanced Stop Conditions
Control when conversations end:
- **Response Count**: Set a maximum number of agent responses
- **Keyword Detection**: Stop when specific words or phrases appear
- **Custom Logic**: Combine multiple stopping criteria

### Configuration Persistence
Your settings are automatically saved:
- **Custom Agents**: Names, types, and system prompts
- **Conversation Flows**: Agent sequences and ordering
- **API Keys**: Stored securely in your browser only
- **Preferences**: All conversation settings and configurations

### Export Format
Exported conversations include complete context:
```json
{
  "timestamp": "2025-07-02T10:30:00.000Z",
  "configuration": {
    "maxResponses": 6,
    "stopKeyword": "FINISHED",
    "conversationFlow": ["Creative Writer", "Technical Reviewer", "Comedy Assistant"],
    "agents": {
      "Creative Writer": {
        "type": "gemini",
        "systemPrompt": "You are a creative storyteller...",
        "isActive": true
      },
      "Technical Reviewer": {
        "type": "claude",
        "systemPrompt": "You are a technical expert...",
        "isActive": true
      }
    }
  },
  "conversation": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "...", "agent": "Creative Writer" },
    { "role": "assistant", "content": "...", "agent": "Technical Reviewer" }
  ]
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"No agents configured" status**
   - Ensure you've created agents and entered valid API keys
   - Click "Save Configuration" after creating agents

2. **"No flow set" warning**
   - Add agents to your conversation flow using the ➕ button
   - Ensure at least one agent is in the flow before starting

3. **API errors during conversation**
   - Verify your API keys are correct and active
   - Check your internet connection
   - Ensure you have sufficient API quota for the agent types you're using

4. **Agents not responding**
   - Verify the agent type matches your available API keys
   - Check that agents are marked as active
   - Try refreshing the page and reconfiguring

### Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## 🔒 Security Notes

- API keys are stored locally in your browser only
- No data is sent to external servers except the official AI APIs
- Clear your browser data to remove stored API keys
- Never share your API keys publicly

## 🎭 Example Use Cases

### Multi-Perspective Analysis
- **Research Analyst** (Claude) for data analysis
- **Creative Thinker** (Gemini) for innovative ideas  
- **Devil's Advocate** (Claude) for critical evaluation
- Create comprehensive discussions on complex topics

### Creative Collaboration
- **Storyteller** (Gemini) for plot development
- **Character Expert** (Claude) for character analysis
- **Editor** (Claude) for narrative structure
- **Dialogue Specialist** (Gemini) for conversations

### Educational Dialogues
- **Teacher** (Claude) for structured explanations
- **Student** (Gemini) for questions and exploration
- **Expert** (Claude) for advanced insights
- Create interactive learning experiences

### Problem-Solving Teams
- **Brainstormer** (Gemini) for generating ideas
- **Analyst** (Claude) for evaluating solutions
- **Implementation Planner** (Claude) for practical steps
- **Quality Checker** (Claude) for final review

### Entertainment & Games
- **Game Master** (Gemini) for storytelling
- **Player Character** (Claude) for logical decisions
- **NPC** (Gemini) for creative interactions
- **Rules Judge** (Claude) for game mechanics

## 📁 File Structure

```
agent-orchestrator/
├── index.html          # Main web interface
├── styles.css          # UI styling and animations
├── ui-controller.js    # Frontend JavaScript controller
├── server.js           # Express web server
├── agent-orchestrator.js # Core orchestration logic
├── gemini-client.js    # Gemini API client
├── claude-client.js    # Claude API client
├── example-usage.js    # Console-based usage example
└── package.json        # Project configuration
```

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the Agent Orchestrator!

## 📄 License

ISC License - see package.json for details

---

**Enjoy orchestrating conversations between AI agents! 🤖✨**
