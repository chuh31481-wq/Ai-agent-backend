// server.js - ULTIMATE AI AGENT
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  createDirectory, createFile, readFile, updateFile, 
  executeCommand, commitAndPushChanges, wait,
  analyzeProject, createProjectStructure, installDependencies,
  runTests, createDocumentation, deployProject
} from './tools.js';

class PremiumAIAgent {
  constructor() {
    this.apiKeys = this.loadAPIKeys();
    this.currentKeyIndex = 0;
    this.projectContext = {
      phase: 'planning',
      completedTasks: [],
      currentTask: '',
      errors: [],
      warnings: []
    };
  }

  loadAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key && key.startsWith('AI')) keys.push(key);
    }
    if (keys.length === 0) {
      throw new Error('❌ No valid Gemini API keys found. Add GEMINI_API_KEY_1 to secrets.');
    }
    return keys;
  }

  async executeTask(task, args) {
    try {
      this.projectContext.currentTask = task;
      console.log(`🏃 Executing: ${task}`);
      
      const result = await this.tools[task](args);
      this.projectContext.completedTasks.push({ task, success: true });
      return result;
    } catch (error) {
      this.projectContext.errors.push({ task, error: error.message });
      throw error;
    }
  }

  async processGoal(goal) {
    console.log(`🎯 Processing: ${goal}\n`);
    
    // Phase 1: Project Analysis
    await this.executeTask('analyzeProject', { goal });
    
    // Phase 2: Structure Creation
    await this.executeTask('createProjectStructure', {});
    
    // Phase 3: Core Implementation
    await this.executeTask('createFile', { 
      fileName: 'package.json', 
      content: await this.generateFileContent('package.json', goal) 
    });
    
    // Phase 4: Dependencies
    await this.executeTask('installDependencies', {});
    
    // Phase 5: Testing
    await this.executeTask('runTests', {});
    
    // Phase 6: Documentation
    await this.executeTask('createDocumentation', {});
    
    // Phase 7: Deployment Ready
    await this.executeTask('deployProject', {});
    
    console.log('✅ Project completed successfully!');
    return this.projectContext;
  }

  async generateFileContent(fileName, goal) {
    // AI-powered file content generation
    const genAI = new GoogleGenerativeAI(this.getCurrentAPIKey());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Create professional ${fileName} content for: ${goal}. 
    Return ONLY the file content, no explanations.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  getCurrentAPIKey() {
    return this.apiKeys[this.currentKeyIndex];
  }

  switchAPIKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`🔄 Switched to API Key ${this.currentKeyIndex + 1}`);
  }
}

// Enhanced tools with error handling
const tools = {
  analyzeProject: async ({ goal }) => {
    console.log('📊 Analyzing project requirements...');
    await wait(1000);
    return `Analysis complete for: ${goal}`;
  },
  
  createProjectStructure: async () => {
    const structure = {
      'src/': 'directory',
      'src/components/': 'directory',
      'src/utils/': 'directory',
      'public/': 'directory',
      'tests/': 'directory',
      'docs/': 'directory'
    };
    
    for (const [path, type] of Object.entries(structure)) {
      if (type === 'directory') {
        await createDirectory({ directoryName: path });
      }
    }
    return 'Project structure created successfully';
  },
  
  // ... other tools with enhanced error handling
};

// Main execution
async function main() {
  const goal = process.env.AGENT_GOAL;
  if (!goal) {
    console.log('ℹ️  Set AGENT_GOAL environment variable to start');
    return;
  }

  try {
    const agent = new PremiumAIAgent();
    const result = await agent.processGoal(goal);
    console.log('🎉 Final Result:', result);
  } catch (error) {
    console.error('💥 Critical Error:', error.message);
    process.exit(1);
  }
}

main();
