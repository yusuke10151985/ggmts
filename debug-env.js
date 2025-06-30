#!/usr/bin/env node

console.log('🔍 Environment Variable Diagnostic Tool\n');

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file found');
  
  // Manually load .env.local
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key] = value;
      }
    }
  });
} else {
  console.log('❌ .env.local file not found');
}

// Check API keys
console.log('📋 API Key Status:');
console.log('─'.repeat(50));

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const googleKey = process.env.GOOGLE_API_KEY;

console.log(`GEMINI_API_KEY: ${geminiKey ? '✅ Set' : '❌ Not set'}`);
if (geminiKey) {
  console.log(`  Length: ${geminiKey.length} characters`);
  console.log(`  Preview: ${geminiKey.substring(0, 10)}...`);
}

console.log(`OPENAI_API_KEY: ${openaiKey ? '✅ Set' : '❌ Not set'}`);
if (openaiKey) {
  console.log(`  Length: ${openaiKey.length} characters`);
  console.log(`  Preview: ${openaiKey.substring(0, 10)}...`);
}

console.log(`GOOGLE_API_KEY: ${googleKey ? '⚠️  Set (fallback)' : '❌ Not set'}`);
if (googleKey) {
  console.log(`  Length: ${googleKey.length} characters`);
  console.log(`  Preview: ${googleKey.substring(0, 10)}...`);
}

// Check for potential issues
console.log('\n🔍 Potential Issues:');
console.log('─'.repeat(50));

if (geminiKey && googleKey) {
  console.log('⚠️  Both GEMINI_API_KEY and GOOGLE_API_KEY are set');
  console.log('   Note: GEMINI_API_KEY will be used for Gemini API calls');
} else if (!geminiKey && googleKey) {
  console.log('⚠️  Only GOOGLE_API_KEY is set, but GEMINI_API_KEY is preferred');
} else if (!geminiKey && !googleKey) {
  console.log('❌ No API keys found for Gemini');
}

if (geminiKey && geminiKey.startsWith('AIza')) {
  console.log('✅ GEMINI_API_KEY appears to be a valid Google API key format');
} else if (geminiKey) {
  console.log('⚠️  GEMINI_API_KEY format may be incorrect (should start with "AIza")');
}

if (openaiKey && openaiKey.startsWith('sk-')) {
  console.log('✅ OPENAI_API_KEY appears to be a valid OpenAI API key format');
} else if (openaiKey) {
  console.log('⚠️  OPENAI_API_KEY format may be incorrect (should start with "sk-")');
}

console.log('\n📝 Next Steps:');
console.log('─'.repeat(50));
console.log('1. If API keys are missing, edit .env.local and add them');
console.log('2. Restart your development server: npm run dev');
console.log('3. Test the translation functionality');
console.log('\n🔗 Get API Keys:');
console.log('   Gemini: https://makersuite.google.com/app/apikey');
console.log('   OpenAI: https://platform.openai.com/api-keys\n'); 