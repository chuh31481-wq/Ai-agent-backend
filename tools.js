// tools.js (FINAL, COMPLETE, AND FULLY-FUNCTIONAL VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const MEMORY_FILE = path.join(ROOT_DIR, 'memory.json');

// Helper function to create a safe file path within the project
function getSafePath(fileName) {
    const absolutePath = path.resolve(ROOT_DIR, fileName);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

// --- Tamam Asal Tools ---
async function createDirectory({ directoryName }) {
    const dirPath = getSafePath(directoryName);
    await fs.mkdir(dirPath, { recursive: true });
    return `Directory '${directoryName}' created successfully.`;
}

async function createFile({ fileName, content }) {
    const filePath = getSafePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return `File '${fileName}' created successfully.`;
}

async function readFile({ fileName }) {
    const filePath = getSafePath(fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
}

async function updateFile({ fileName, newContent }) {
    const filePath = getSafePath(fileName);
    await fs.writeFile(filePath, newContent);
    return `File '${fileName}' updated successfully.`;
}

function executeCommand({ command, directory = '' }) {
    const execDir = directory ? getSafePath(directory) : ROOT_DIR;
    return new Promise((resolve) => {
        exec(command, { cwd: execDir }, (error, stdout, stderr) => {
            if (error) {
                resolve(`Execution Error: ${error.message}\nStderr: ${stderr}`);
            } else {
                resolve(`Command Output:\n${stdout}`);
            }
        });
    });
}

async function createGithubRepo({ repoName }) {
    const token = process.env.AGENT_GITHUB_TOKEN;
    if (!token) { return "Error: AGENT_GITHUB_TOKEN is not set."; }
    const octokit = new Octokit({ auth: token });
    try {
        const response = await octokit.repos.createForAuthenticatedUser({ name: repoName });
        return `Successfully created repository: ${response.data.html_url}`;
    } catch (error) {
        return `Error creating repository: ${error.message}`;
    }
}

async function commitAndPushChanges({ commitMessage }) {
    await executeCommand({ command: 'git config --global user.name "AI Agent"' });
    await executeCommand({ command: 'git config --global user.email "ai-agent@users.noreply.github.com"' });
    await executeCommand({ command: 'git add .' });
    const commitResult = await executeCommand({ command: `git commit -m "${commitMessage}"` });
    if (commitResult.includes("nothing to commit")) {
        return "No changes were detected to commit.";
    }
    const pushResult = await executeCommand({ command: 'git push origin main' });
    if (pushResult.includes("Execution Error")) {
        return pushResult; // Push fail hone par error wapas bhejein
    }
    return `Successfully committed and pushed changes with message: "${commitMessage}"`;
}

async function wait({ seconds }) {
    console.log(`Waiting for ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return `Successfully waited for ${seconds} seconds.`;
}

async function remember({ key, value }) {
    let memory = {};
    try {
        const data = await fs.readFile(MEMORY_FILE, 'utf-8');
        memory = JSON.parse(data);
    } catch (e) {
        console.log("Memory file not found, creating a new one.");
    }
    memory[key] = value;
    await fs.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
    return `Successfully remembered the value for key: '${key}'.`;
}

// Export all tools for Node.js
module.exports = {
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
    commitAndPushChanges,
    wait,
    remember
};
