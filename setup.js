// setup.js - Automatic environment setup
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Setting up Enhanced AI Agent...');

// Check Node.js version
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);

if (parseFloat(nodeVersion.slice(1)) < 18) {
    console.error('❌ Node.js 18 or higher required');
    process.exit(1);
}

// Create necessary directories
const dirs = [
    'projects',
    'templates',
    'logs',
    'backups',
    '.github/workflows'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Create default environment file
if (!fs.existsSync('.env')) {
    const envContent = `# AI Agent Configuration
AGENT_MODE=production
MAX_PROJECT_SIZE=large
DEFAULT_TECH_STACK=mern
BACKUP_ENABLED=true
LOG_LEVEL=debug

# Add your Gemini API keys below
GEMINI_API_KEY_1=your_key_here
GEMINI_API_KEY_2=your_second_key_here
`;
    fs.writeFileSync('.env', envContent);
    console.log('✅ Created .env template');
}

console.log('🎉 Setup completed! Next steps:');
console.log('1. Edit .env file with your API keys');
console.log('2. Run: npm run large-project');
console.log('3. Or trigger via GitHub Actions');
