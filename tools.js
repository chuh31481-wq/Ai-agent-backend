// tools.js (FINAL, INSPIRED BY A-TEAM OPEN-SOURCE PROJECT)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const LOG_FILE = path.join(ROOT_DIR, 'agent_log.json');

function getSafePath(filePath) {
    const absolutePath = path.resolve(ROOT_DIR, filePath);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${filePath}`);
    }
    return absolutePath;
}

// Har function ab behtar error handling aur flexibility ke saath hai
async function createDirectory(args) {
    const dirPath = args.directoryName || args.path;
    if (!dirPath) { return "Error: You must provide the 'directoryName' parameter."; }
    await fs.mkdir(getSafePath(dirPath), { recursive: true });
    return `Directory '${dirPath}' created successfully.`;
}

async function createFile(args) {
    const fileName = args.fileName || args.path;
    const content = args.content;
    if (!fileName) { return "Error: You must provide the 'fileName' parameter."; }
    if (content === undefined) { return "Error: You must provide the 'content' parameter."; }
    const filePath = getSafePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return `File '${fileName}' created successfully.`;
}

async function readFile(args) {
    const fileName = args.fileName || args.path;
    if (!fileName) { return "Error: You must provide the 'fileName' parameter."; }
    const filePath = getSafePath(fileName);
    return await fs.readFile(filePath, 'utf-8');
}

async function updateFile(args) {
    const fileName = args.fileName || args.path;
    const newContent = args.newContent || args.content;
    if (!fileName || newContent === undefined) { return "Error: You must provide 'fileName' and 'newContent' parameters."; }
    const filePath = getSafePath(fileName);
    await fs.writeFile(filePath, newContent);
    return `File '${fileName}' updated successfully.`;
}

function executeCommand({ command }) {
    if (!command) { return "Error: You must provide the 'command' parameter."; }
    return new Promise((resolve) => {
        exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            if (error) { resolve(`Execution Error: ${error.message}\nStderr: ${stderr}`); } 
            else { resolve(`Command Output:\n${stdout}`); }
        });
    });
}

async function commitAndPushChanges({ commitMessage }) {
    if (!commitMessage) { return "Error: You must provide the 'commitMessage' parameter."; }
    await executeCommand({ command: 'git config --global user.name "AI Agent"' });
    await executeCommand({ command: 'git config --global user.email "ai-agent@users.noreply.github.com"' });
    await executeCommand({ command: 'git add .' });
    const commitResult = await executeCommand({ command: `git commit -m "${commitMessage}"` });
    if (commitResult.includes("nothing to commit")) { return "No changes were detected to commit."; }
    const pushResult = await executeCommand({ command: 'git push origin main' });
    if (pushResult.includes("Execution Error")) { return pushResult; }
    return `Successfully committed and pushed changes with message: "${commitMessage}"`;
}

// Baqi tools waise hi rahenge
async function createGithubRepo({ repoName }) { /* ... */ }
async function wait({ seconds }) { /* ... */ }
async function logMission({ missionData }) { /* ... */ }

module.exports = {
    createDirectory, createFile, readFile, updateFile, executeCommand,
    createGithubRepo, commitAndPushChanges, wait, logMission
};
