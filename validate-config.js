const { config, validateApiKeys, getApiKey } = require('./config');

async function validateApiKeyFormat() {
    console.log('🔍 Validating API Key Configuration...\n');
    
    // Check environment variables
    const geminiKey = getApiKey('gemini');
    const claudeKey = getApiKey('claude');
    
    console.log('📋 Current Configuration:');
    console.log(`Gemini API Key: ${geminiKey ? (geminiKey.substring(0, 20) + '...') : 'Not configured'}`);
    console.log(`Claude API Key: ${claudeKey ? (claudeKey.substring(0, 20) + '...') : 'Not configured'}\n`);
    
    // Validate Gemini key
    if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
        if (geminiKey.startsWith('AIzaSy')) {
            console.log('✅ Gemini API key format looks correct');
        } else {
            console.log('❌ Gemini API key format may be incorrect (should start with "AIzaSy")');
        }
    } else {
        console.log('⚠️  Gemini API key not configured');
    }
    
    // Validate Claude key
    if (claudeKey && claudeKey !== 'YOUR_CLAUDE_API_KEY_HERE') {
        if (claudeKey.includes('…') || claudeKey.includes('...')) {
            console.log('❌ Claude API key contains ellipsis characters - key is incomplete!');
            console.log('   Please copy the complete key from https://console.anthropic.com/');
        } else if (claudeKey.startsWith('sk-ant-')) {
            console.log('✅ Claude API key format looks correct');
        } else {
            console.log('❌ Claude API key format may be incorrect (should start with "sk-ant-")');
        }
    } else {
        console.log('⚠️  Claude API key not configured');
    }
    
    console.log('\n📝 Recommendations:');
    
    if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.log('- Get a Gemini API key from: https://makersuite.google.com/app/apikey');
    }
    
    if (!claudeKey || claudeKey === 'YOUR_CLAUDE_API_KEY_HERE') {
        console.log('- Get a Claude API key from: https://console.anthropic.com/');
    }
    
    if (claudeKey && (claudeKey.includes('…') || claudeKey.includes('...'))) {
        console.log('- Replace the incomplete Claude API key in your .env file');
        console.log('- Make sure to copy the COMPLETE key without any truncation');
    }
    
    console.log('- Add delays between API calls to avoid rate limiting');
    console.log('- Consider using fewer agents or reducing max responses during testing');
}

async function testApiConnections() {
    console.log('\n🧪 Testing API Connections...\n');
    
    const GeminiClient = require('./gemini-client');
    const ClaudeClient = require('./claude-client');
    
    // Test Gemini
    try {
        const gemini = new GeminiClient();
        const geminiKey = getApiKey('gemini');
        
        if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            console.log('Testing Gemini connection...');
            const response = await gemini.generateResponse('Say "Gemini connection successful" if you can read this.');
            console.log('✅ Gemini connection successful');
            console.log(`Response: ${response.substring(0, 100)}...\n`);
        } else {
            console.log('⏭️  Skipping Gemini test - API key not configured\n');
        }
    } catch (error) {
        console.log('❌ Gemini connection failed:', error.message);
        if (error.message.includes('429')) {
            console.log('   This is a rate limit error - try again in a few minutes\n');
        } else {
            console.log('   Check your API key and network connection\n');
        }
    }
    
    // Test Claude
    try {
        const claude = new ClaudeClient();
        const claudeKey = getApiKey('claude');
        
        if (claudeKey && claudeKey !== 'YOUR_CLAUDE_API_KEY_HERE') {
            console.log('Testing Claude connection...');
            const response = await claude.generateResponse('Say "Claude connection successful" if you can read this.');
            console.log('✅ Claude connection successful');
            console.log(`Response: ${response.substring(0, 100)}...\n`);
        } else {
            console.log('⏭️  Skipping Claude test - API key not configured\n');
        }
    } catch (error) {
        console.log('❌ Claude connection failed:', error.message);
        if (error.message.includes('invalid characters') || error.message.includes('ByteString')) {
            console.log('   This indicates your API key has invalid characters (like …)\n');
        } else if (error.message.includes('429')) {
            console.log('   This is a rate limit error - try again in a few minutes\n');
        } else {
            console.log('   Check your API key and network connection\n');
        }
    }
}

async function main() {
    await validateApiKeyFormat();
    await testApiConnections();
    
    console.log('🎯 Next Steps:');
    console.log('1. Fix any API key issues shown above');
    console.log('2. Wait a few minutes if you got rate limit errors');
    console.log('3. Try running conversations with fewer agents or responses');
    console.log('4. The app now has better error handling and retry logic');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { validateApiKeyFormat, testApiConnections };
