#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables for GGMTS...\n');

// Check if .env.local already exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists. Backing up to .env.local.backup');
  fs.copyFileSync(envPath, envPath + '.backup');
}

// Read the example file
const examplePath = path.join(__dirname, 'env.example');
if (!fs.existsSync(examplePath)) {
  console.error('❌ env.example not found!');
  process.exit(1);
}

const exampleContent = fs.readFileSync(examplePath, 'utf8');

// Create .env.local with instructions
const envContent = `# API Keys - Replace with your actual API keys
# Get Gemini API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Get OpenAI API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Database (if needed in future)
DATABASE_URL=your_database_url_here

# Analytics (optional)
GOOGLE_ANALYTICS_ID=your_ga_id_here

# Instructions:
# 1. Replace 'your_gemini_api_key_here' with your actual Gemini API key
# 2. Replace 'your_openai_api_key_here' with your actual OpenAI API key
# 3. Save this file
# 4. Restart your development server: npm run dev
`;

fs.writeFileSync(envPath, envContent);

console.log('✅ Created .env.local file');
console.log('📝 Please edit .env.local and add your actual API keys:');
console.log('   - GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey');
console.log('   - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys');
console.log('\n🔄 After adding your API keys, restart your development server:');
console.log('   npm run dev\n'); 