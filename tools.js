// tools.js (FINAL, COMPLETE, AND FLEXIBLE VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const LOG_FILE = path.join(ROOT_DIR, 'agent_log.json');

// Helper function to create a safe file path within the project
function getSafePath(fileName) {
    const absolutePath = path.resolve(ROOT_DIR, fileName);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

// --- Tamam Zaroori Tools ---
async function createDirectory({ directoryName }) {
    const dirPath = getSafePath(directoryName);
    await fs.mkdir(dirPath, { recursive: true });
    return `Directory '${directoryName}' created successfully.`;
}

// === FLEXIBLE createFile FUNCTION ===
async function createFile(args) {
    // AI kabhi 'fileName' bhejta hai, kabhi 'file_name'. Hum dono ko handle karenge.
    const fileName = args.fileName || args.file_name;
    const content = args.content;

    if (!fileName) {
        return "Error: You must provide a file name (fileName or file_name).";
    }

    const filePath = getSafePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content || ''); // Agar content na ho to khali file banao
    return `File '${fileName}' created successfully.`;
}
// =================================

async function readFile({ fileName }) {
    const filePath = getSafePath(fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
}

async function updateFile(args) {
    const fileName = args.fileName || args.file_name;
    const newContent = args.newContent || args.content;

    if (!fileName) {
        return "Error: You must provide a file name (fileName or file_name).";
    }

    const filePath = getSafePath(fileName);
    await fs.writeFile(filePath, newContent || '');
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
        return pushResult;
    }
    return `Successfully committed and pushed changes with message: "${commitMessage}"`;
}

async function wait({ seconds }) {
    console.log(`Waiting for ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return `Successfully waited for ${seconds} seconds.`;
}

// === NAYI "LEARNING" WALI SUPERPOWER ===
async function logMission({ missionData }) {
    let logs = [];
    try {
        const data = await fs.readFile(LOG_FILE, 'utf-8');
        logs = JSON.parse(data);
    } catch (e) {
        console.log("Log file not found, creating a new one.");
    }
    logs.push(JSON.parse(missionData));
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
    return `Successfully logged the mission. The agent now has a new experience.`;
}
// ==========================================

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
    logMission
};
