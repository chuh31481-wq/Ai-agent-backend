// tools.js (FINAL, COMPLETE, AND STANDARDIZED VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const LOG_FILE = path.join(ROOT_DIR, 'agent_log.json');

function getSafePath(fileName) {
    const absolutePath = path.resolve(ROOT_DIR, fileName);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

// --- Tamam Standardized Tools ---

async function createDirectory(args) {
    const directoryName = args.directoryName || args.path || args.name;
    if (!directoryName) { return "Error: You must provide a directory name."; }
    const dirPath = getSafePath(directoryName);
    await fs.mkdir(dirPath, { recursive: true });
    return `Directory '${directoryName}' created successfully.`;
}

async function createFile(args) {
    const fileName = args.fileName || args.file_name || args.name;
    const content = args.content;
    if (!fileName) { return "Error: You must provide a file name."; }
    const filePath = getSafePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content || '');
    return `File '${fileName}' created successfully.`;
}

async function readFile(args) {
    const fileName = args.fileName || args.file_name || args.path;
    if (!fileName) { return "Error: You must provide a file name to read."; }
    const filePath = getSafePath(fileName);
    return await fs.readFile(filePath, 'utf-8');
}

async function updateFile(args) {
    const fileName = args.fileName || args.file_name || args.path;
    const newContent = args.newContent || args.content;
    if (!fileName) { return "Error: You must provide a file name to update."; }
    const filePath = getSafePath(fileName);
    await fs.writeFile(filePath, newContent || '');
    return `File '${fileName}' updated successfully.`;
}

function executeCommand(args) {
    const command = args.command;
    if (!command) { return Promise.resolve("Error: You must provide a command to execute."); }
    const directory = args.directory || '';
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

async function createGithubRepo(args) {
    const repoName = args.repoName || args.name;
    if (!repoName) { return "Error: You must provide a repository name."; }
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

async function commitAndPushChanges(args) {
    const commitMessage = args.commitMessage || args.message;
    if (!commitMessage) { return "Error: You must provide a commit message."; }
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
    if (typeof seconds !== 'number') { return "Error: Seconds must be a number."; }
    console.log(`Waiting for ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return `Successfully waited for ${seconds} seconds.`;
}

async function logMission({ missionData }) {
    let logs = [];
    try {
        // Yahan 'readFile' tool ko direct call karne ke bajaye, fs.readFile istemal karein
        const data = await fs.readFile(LOG_FILE, 'utf-8');
        logs = JSON.parse(data);
    } catch (e) {
        console.log("Log file not found, creating a new one.");
    }
    // Yahan JSON.parse() ki zaroorat nahi, kyunke AI ab seedha object bhejega
    logs.push(missionData);
    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
    return `Successfully logged the mission.`;
}

module.exports = {
    createDirectory, createFile, readFile, updateFile, executeCommand, createGithubRepo, commitAndPushChanges, wait, logMission
};
