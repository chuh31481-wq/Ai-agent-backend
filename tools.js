// tools.js - ENHANCED FOR LARGE PROJECTS
const fs = require('fs').promises;
const path = require('path');
const { exec, execSync } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const PROJECT_LOG = path.join(ROOT_DIR, 'project_manifest.json');

// Enhanced security and path handling
function getSafePath(filePath) {
    const absolutePath = path.resolve(ROOT_DIR, filePath);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security violation: Path outside project: ${filePath}`);
    }
    return absolutePath;
}

// Project Templates Database
const PROJECT_TEMPLATES = {
    'react-component': {
        extension: '.jsx',
        content: `import React from 'react';
const {componentName} = ({ props }) => {
    return (
        <div className="{componentName}">
            {/* Component content */}
        </div>
    );
};
export default {componentName};`
    },
    'express-server': {
        extension: '.js',
        content: `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});`
    },
    'python-class': {
        extension: '.py',
        content: `class {className}:
    def __init__(self):
        pass
    
    def __str__(self):
        return "{className} instance"
    
    # Add your methods here`
    }
};

// NEW: Advanced Project Analysis
async function analyzeProjectRequirements({ requirements, technologyStack, deliverables }) {
    const analysis = {
        timestamp: new Date().toISOString(),
        requirements: requirements,
        suggestedStack: technologyStack || 'MERN (MongoDB, Express, React, Node.js)',
        estimatedFiles: 15, // Default estimate
        complexity: 'medium',
        deliverables: deliverables ? deliverables.split(',') : ['source code', 'documentation', 'tests']
    };
    
    // Save analysis for reference
    await fs.writeFile(PROJECT_LOG, JSON.stringify(analysis, null, 2));
    return `Project analysis complete. Suggested approach: ${analysis.suggestedStack}`;
}

// NEW: Create Complete Project Structure
async function createProjectStructure({ structure }) {
    try {
        const projectLayout = JSON.parse(structure);
        let createdCount = 0;
        
        for (const [itemPath, itemType] of Object.entries(projectLayout)) {
            const fullPath = getSafePath(itemPath);
            
            if (itemType === 'directory') {
                await fs.mkdir(fullPath, { recursive: true });
                createdCount++;
            } else if (itemType === 'file') {
                await fs.writeFile(fullPath, '// Auto-generated file\n');
                createdCount++;
            }
        }
        
        return `Project structure created successfully: ${createdCount} items`;
    } catch (error) {
        return `Error creating structure: ${error.message}`;
    }
}

// NEW: Smart File Creation with Templates
async function createFileWithTemplate({ fileName, templateType, customContent }) {
    const template = PROJECT_TEMPLATES[templateType];
    if (!template) {
        return `Template not found: ${templateType}. Available: ${Object.keys(PROJECT_TEMPLATES).join(', ')}`;
    }
    
    const fullPath = getSafePath(fileName + template.extension);
    let content = template.content;
    
    // Basic template variable replacement
    if (customContent) {
        content = customContent;
    } else {
        const componentName = path.basename(fileName).replace(/[^a-zA-Z0-9]/g, '');
        content = content.replace(/{componentName}/g, componentName)
                        .replace(/{className}/g, componentName);
    }
    
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return `File created: ${fullPath} using ${templateType} template`;
}

// NEW: Smart Dependency Installation
async function installDependencies({ packageManager, dependencies }) {
    const commands = {
        'npm': `npm install ${dependencies || ''}`,
        'yarn': `yarn add ${dependencies || ''}`,
        'pip': `pip install ${dependencies || ''}`,
        'pip3': `pip3 install ${dependencies || ''}`
    };
    
    const command = commands[packageManager];
    if (!command) {
        return `Unsupported package manager: ${packageManager}`;
    }
    
    return new Promise((resolve) => {
        exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            if (error) {
                resolve(`Installation failed: ${error.message}`);
            } else {
                resolve(`Dependencies installed successfully: ${stdout}`);
            }
        });
    });
}

// NEW: Comprehensive Testing
async function runTestsAndValidate({ testCommand, validationCriteria }) {
    const command = testCommand || 'npm test';
    
    return new Promise((resolve) => {
        exec(command, { cwd: ROOT_DIR, timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
                resolve(`Tests failed: ${error.message}\nOutput: ${stdout}`);
            } else {
                resolve(`Tests passed! Output: ${stdout}`);
            }
        });
    });
}

// NEW: Professional Documentation
async function createDocumentation({ docType, content }) {
    const docs = {
        'readme': '# Project Documentation\n\n' + (content || 'Automatically generated by AI Agent'),
        'api': '# API Documentation\n\n' + (content || 'Endpoints and usage instructions'),
        'setup': '# Setup Instructions\n\n' + (content || 'Installation and configuration guide')
    };
    
    const filename = `README.${docType.toUpperCase()}.md`;
    await fs.writeFile(getSafePath(filename), docs[docType]);
    return `Documentation created: ${filename}`;
}

// Keep all existing tools from your original version
async function createDirectory(args) { /* ... existing code ... */ }
async function createFile(args) { /* ... existing code ... */ }
async function readFile(args) { /* ... existing code ... */ }
async function updateFile(args) { /* ... existing code ... */ }
async function executeCommand(args) { /* ... existing code ... */ }
async function commitAndPushChanges(args) { /* ... existing code ... */ }
async function wait(args) { /* ... existing code ... */ }
async function logMission(args) { /* ... existing code ... */ }

module.exports = {
    // New enhanced tools
    analyzeProjectRequirements,
    createProjectStructure,
    createFileWithTemplate,
    installDependencies,
    runTestsAndValidate,
    createDocumentation,
    
    // Original tools
    createDirectory, createFile, readFile, updateFile, 
    executeCommand, commitAndPushChanges, wait, logMission
};
