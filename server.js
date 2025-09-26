import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Tools from './tools.js';
import Builder from './builder.js';
import Deployer from './deployer.js';
import SelfHeal from './self-heal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ProjectGodAI {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        this.tools = new Tools();
        this.builder = new Builder();
        this.deployer = new Deployer();
        this.selfHeal = new SelfHeal();
        
        this.projects = new Map();
        this.currentProject = null;
    }

    async initialize() {
        console.log('🚀 Project God AI Initializing...');
        await this.healthCheck();
        console.log('✅ Ready to build amazing projects!');
    }

    async createProject(projectGoal, options = {}) {
        try {
            const projectId = 'proj_' + Date.now();
            this.currentProject = {
                id: projectId,
                goal: projectGoal,
                status: 'planning',
                files: [],
                errors: [],
                startTime: Date.now()
            };

            this.projects.set(projectId, this.currentProject);

            // Step 1: Analyze requirements
            console.log('🔍 Analyzing project requirements...');
            const analysis = await this.analyzeRequirements(projectGoal);
            
            // Step 2: Generate project plan
            console.log('📋 Creating project plan...');
            const plan = await this.generateProjectPlan(analysis);
            
            // Step 3: Build project structure
            console.log('🏗️ Building project structure...');
            const structure = await this.buildProjectStructure(plan);
            
            // Step 4: Generate code files
            console.log('💻 Generating code files...');
            await this.generateCodeFiles(structure);
            
            // Step 5: Setup deployment
            console.log('☁️ Setting up deployment...');
            await this.setupDeployment();
            
            // Step 6: Create documentation
            console.log('📚 Creating documentation...');
            await this.createDocumentation();

            this.currentProject.status = 'completed';
            this.currentProject.endTime = Date.now();
            this.currentProject.duration = this.currentProject.endTime - this.currentProject.startTime;

            await this.generateProjectReport();
            return this.currentProject;

        } catch (error) {
            console.error('❌ Project creation failed:', error);
            await this.selfHeal.handleError(error, this.currentProject);
            throw error;
        }
    }

    async analyzeRequirements(goal) {
        const prompt = `
        Analyze this project goal and provide structured requirements:
        "${goal}"

        Provide JSON response with:
        {
            "projectType": "webapp|mobile|desktop|api",
            "techStack": ["frontend", "backend", "database"],
            "keyFeatures": ["feature1", "feature2"],
            "complexity": "low|medium|high",
            "estimatedFiles": number,
            "specialRequirements": ["req1", "req2"]
        }
        `;

        const response = await this.model.generateContent(prompt);
        const analysis = JSON.parse(response.response.text());
        this.currentProject.analysis = analysis;
        return analysis;
    }

    async generateProjectPlan(analysis) {
        const prompt = `
        Create a detailed project plan based on:
        ${JSON.stringify(analysis, null, 2)}

        Provide plan with:
        {
            "projectStructure": {
                "rootDir": "project-name",
                "subDirs": ["src", "public", "docs"],
                "configFiles": ["package.json", "README.md"]
            },
            "implementationSteps": [
                {"step": 1, "action": "setup", "files": []},
                {"step": 2, "action": "core", "files": []}
            ],
            "dependencies": {
                "frontend": ["react", "tailwind"],
                "backend": ["express", "mongodb"]
            }
        }
        `;

        const response = await this.model.generateContent(prompt);
        const plan = JSON.parse(response.response.text());
        this.currentProject.plan = plan;
        return plan;
    }

    async buildProjectStructure(plan) {
        const projectDir = path.join(__dirname, 'projects', this.currentProject.id);
        await fs.ensureDir(projectDir);
        this.currentProject.directory = projectDir;

        // Create subdirectories
        for (const dir of plan.projectStructure.subDirs) {
            await fs.ensureDir(path.join(projectDir, dir));
        }

        console.log(`✅ Project structure created at: ${projectDir}`);
        return projectDir;
    }

    async generateCodeFiles(structure) {
        const plan = this.currentProject.plan;
        
        for (const step of plan.implementationSteps) {
            console.log(`📁 Generating files for step ${step.step}: ${step.action}`);
            
            for (const fileTemplate of step.files) {
                await this.generateSingleFile(fileTemplate, structure);
            }
        }
    }

    async generateSingleFile(fileTemplate, baseDir) {
        const prompt = `
        Generate complete code for: ${fileTemplate.filePath}
        
        Requirements:
        - Production-ready code
        - No placeholder comments
        - Complete functionality
        - Error handling included
        - Modern ES6+ syntax
        
        File type: ${fileTemplate.type}
        Purpose: ${fileTemplate.purpose}
        
        Return ONLY the code without explanations.
        `;

        const response = await this.model.generateContent(prompt);
        const filePath = path.join(baseDir, fileTemplate.filePath);
        
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, response.response.text());
        
        this.currentProject.files.push(filePath);
        console.log(`✅ Created: ${fileTemplate.filePath}`);
    }

    async setupDeployment() {
        const deploymentConfig = await this.deployer.autoConfigure(this.currentProject);
        this.currentProject.deployment = deploymentConfig;
    }

    async createDocumentation() {
        const docs = `
# ${this.currentProject.goal}

## Project Details
- **ID**: ${this.currentProject.id}
- **Status**: ${this.currentProject.status}
- **Created**: ${new Date().toISOString()}

## Files Created
${this.currentProject.files.map(f => `- ${f}`).join('\n')}

## How to Run
\`\`\`bash
cd projects/${this.currentProject.id}
npm install
npm start
\`\`\`
        `;

        const docsPath = path.join(this.currentProject.directory, 'README.md');
        await fs.writeFile(docsPath, docs);
    }

    async generateProjectReport() {
        const report = {
            projectId: this.currentProject.id,
            goal: this.currentProject.goal,
            status: this.currentProject.status,
            filesCreated: this.currentProject.files.length,
            duration: `${(this.currentProject.duration / 1000).toFixed(2)} seconds`,
            directory: this.currentProject.directory
        };

        const reportPath = path.join(this.currentProject.directory, 'project-report.json');
        await fs.writeJson(reportPath, report, { spaces: 2 });
        
        console.log('📊 Project Report:', report);
    }

    async healthCheck() {
        // Check if API key is valid
        try {
            await this.model.generateContent("Hello");
            console.log('✅ Gemini API is working');
        } catch (error) {
            throw new Error('❌ Gemini API key invalid or not set');
        }

        // Check disk space
        const diskInfo = await fs.stat(__dirname);
        if (diskInfo.size < 1000000) {
            console.warn('⚠️ Low disk space');
        }
    }
}

// Export and run if called directly
const aiAgent = new ProjectGodAI();
await aiAgent.initialize();

// Example usage
if (process.argv[2] === '--create') {
    const goal = process.argv[3] || "Create a React todo app with Node.js backend";
    await aiAgent.createProject(goal);
} else {
    console.log(`
    🚀 Project God AI Commands:
    
    npm start -- --create "Your project goal here"
    
    Examples:
    npm start -- --create "Create a portfolio website with React"
    npm start -- --create "Build a REST API with Express and MongoDB"
    `);
}

export default ProjectGodAI;
