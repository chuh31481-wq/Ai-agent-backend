// tools.js
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

// Workspace directory, relative to the runner's workspace
const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace');

async function ensureWorkspace() {
    try {
        await fs.access(WORKSPACE_DIR);
    } catch (error) {
        console.log("Workspace directory does not exist. Creating it.");
        await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    }
}

function getSafePath(fileName) {
    const absolutePath = path.resolve(WORKSPACE_DIR, fileName);
    if (!absolutePath.startsWith(WORKSPACE_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the workspace: ${fileName}`);
    }
    return absolutePath;
}

async function createDirectory({ directoryName }) {
    await ensureWorkspace();
    const dirPath = getSafePath(directoryName);
    await fs.mkdir(dirPath, { recursive: true });
    return `Directory '${directoryName}' created successfully inside workspace.`;
}

async function createFile({ fileName, content }) {
    await ensureWorkspace();
    const filePath = getSafePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return `File '${fileName}' created successfully inside workspace.`;
}

async function readFile({ fileName }) {
    await ensureWorkspace();
    const filePath = getSafePath(fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
}

async function updateFile({ fileName, newContent }) {
    await ensureWorkspace();
    const filePath = getSafePath(fileName);
    await fs.writeFile(filePath, newContent);
    return `File '${fileName}' updated successfully.`;
}

async function executeCommand({ command, directory = '' }) {
    await ensureWorkspace();
    const execDir = getSafePath(directory);
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
    // Secret ka naya naam istemal karein
    const token = process.env.AGENT_GITHUB_TOKEN;
    if (!token) {
        return "Error: AGENT_GITHUB_TOKEN is not set in GitHub Secrets.";
    }
    const octokit = new Octokit({ auth: token });
    try {
        const response = await octokit.repos.createForAuthenticatedUser({ name: repoName });
        return `Successfully created repository: ${response.data.html_url}`;
    } catch (error) {
        return `Error creating repository: ${error.message}`;
    }
}

// Node.js ke liye sahi tareeqe se export karein
module.exports = {
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo
};
