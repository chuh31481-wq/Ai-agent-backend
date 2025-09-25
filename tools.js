// tools.js (FINAL, FLEXIBLE PARAMETER VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const LOG_FILE = 'agent_log.json';

function getSafePath(fileName) {
    const absolutePath = path.resolve(ROOT_DIR, fileName);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

// === YEH HAI ASAL TABDEELI ===
async function createDirectory(args) {
    // AI kabhi 'directoryName' bhejta hai, kabhi 'path'. Hum dono ko handle karenge.
    const directoryName = args.directoryName || args.path;

    if (!directoryName) { return "Error: You must provide a directory name (directoryName or path)."; }
    const dirPath = getSafePath(directoryName);
    await fs.mkdir(dirPath, { recursive: true });
    return `Directory '${directoryName}' created successfully.`;
}
// ============================

async function createFile(args) {
    const fileName = args.fileName || args.file_path || args.name;
    const content = args.content;
    if (!fileName) { return "Error: You must provide a file name (fileName, file_path, or name)."; }
    if (content === undefined) { return "Error: You must provide content for the file."; }
    const filePath = getSafePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return `File '${fileName}' created successfully.`;
}

async function readFile({ fileName }) {
    if (!fileName) { return "Error: You must provide a file name."; }
    const filePath = getSafePath(fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
}

async function updateFile({ fileName, newContent }) {
    if (!fileName || newContent === undefined) { return "Error: You must provide a file name and new content."; }
    const filePath = getSafePath(fileName);
    await fs.writeFile(filePath, newContent);
    return `File '${fileName}' updated successfully.`;
}

function executeCommand({ command }) {
    if (!command) { return "Error: You must provide a command to execute."; }
    return new Promise((resolve) => {
        exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            if (error) { resolve(`Execution Error: ${error.message}\nStderr: ${stderr}`); } 
            else { resolve(`Command Output:\n${stdout}`); }
        });
    });
}

async function createGithubRepo({ repoName }) {
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

async function commitAndPushChanges({ commitMessage }) {
    if (!commitMessage) { return "Error: You must provide a commit message."; }
    await executeCommand({ command: 'git config --global user.name "AI Agent"' });
    await executeCommand({ command: 'git config --global user.email "ai-agent@users.noreply.github.com"' });
    await executeCommand({ command: 'git add .' });
    const commitResult = await executeCommand({ command: `git commit -m "${commitMessage}"` });
    if (commitResult.includes("nothing to commit")) { return "No changes were detected to commit."; }
    const pushResult = await executeCommand({ command: 'git push origin main' });
    if (pushResult.includes("Execution Error")) { return pushResult; }
    return `Successfully committed and pushed changes with message: "${commitMessage}"`;
}

async function wait({ seconds }) {
    if (!seconds) { return "Error: You must provide a number of seconds to wait."; }
    console.log(`Waiting for ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return `Successfully waited for ${seconds} seconds.`;
}

async function logMission({ missionData }) {
    if (!missionData) { return "Error: You must provide mission data to log."; }
    let log = [];
    try {
        const data = await fs.readFile(LOG_FILE, 'utf-8');
        log = JSON.parse(data);
    } catch (e) {
        console.log("Log file not found, creating a new one.");
    }
    log.push(JSON.parse(missionData));
    await fs.writeFile(LOG_FILE, JSON.stringify(log, null, 2));
    return `Successfully logged the mission. The agent now has a new experience.`;
}

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
