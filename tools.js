// backend/tools.js

const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const WORKSPACE_DIR = path.join(__dirname, 'agent-workspace');

/**
 * Agent ke workspace mein ek naya folder (directory) banata hai.
 * @param {object} args - Jismein 'directoryName' property ho.
 */
async function createDirectory(args) {
    const { directoryName } = args;
    if (!directoryName) return "Error: 'directoryName' zaroori hai.";
    try {
        const dirPath = path.join(WORKSPACE_DIR, directoryName);
        console.log(`TOOL ACTION: Directory "${dirPath}" bana raha hoon...`);
        await fs.mkdir(dirPath, { recursive: true });
        return `Kamyabi! Directory "${directoryName}" ban gayi hai.`;
    } catch (error) {
        return `Directory banane mein error aayi: ${error.message}`;
    }
}

async function createFile(args) {
    try {
        const { fileName, content } = args;
        if (!fileName || content === undefined) return "Error: 'fileName' aur 'content' dono zaroori hain.";
        // Note: We are now creating the file inside the workspace, not a sub-directory
        const filePath = path.join(WORKSPACE_DIR, fileName);
        // Ensure the directory exists before writing the file
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        console.log(`TOOL ACTION: File "${filePath}" bana raha hoon...`);
        await fs.writeFile(filePath, content);
        return `Kamyabi! File "${fileName}" workspace mein ban gayi hai.`;
    } catch (error) {
        return `File banane mein error aayi: ${error.message}`;
    }
}

async function readFile(args) {
    try {
        const { fileName } = args;
        if (!fileName) return "Error: 'fileName' zaroori hai.";
        const filePath = path.join(WORKSPACE_DIR, fileName);
        console.log(`TOOL ACTION: File "${filePath}" ko parh raha hoon...`);
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        if (error.code === 'ENOENT') return `Error: File "${args.fileName}" nahi mili.`;
        return `File parhne mein error aayi: ${error.message}`;
    }
}

async function updateFile(args) {
    try {
        const { fileName, newContent } = args;
        if (!fileName || newContent === undefined) return "Error: 'fileName' aur 'newContent' dono zaroori hain.";
        const filePath = path.join(WORKSPACE_DIR, fileName);
        console.log(`TOOL ACTION: File "${filePath}" ko update kar raha hoon...`);
        await fs.writeFile(filePath, newContent);
        return `Kamyabi! File "${fileName}" update ho gayi hai.`;
    } catch (error) {
        if (error.code === 'ENOENT') return `Error: File "${args.fileName}" nahi mili, isliye update nahi kar sakta.`;
        return `File update karne mein error aayi: ${error.message}`;
    }
}

async function executeCommand(args) {
    const { command, directory } = args;
    if (!command) return "Error: 'command' zaroori hai.";
    
    // Command ko ya to specific directory mein ya workspace mein chalayein
    const execPath = directory ? path.join(WORKSPACE_DIR, directory) : WORKSPACE_DIR;

    console.log(`TOOL ACTION: Command chala raha hoon: "${command}" in "${execPath}"`);
    return new Promise((resolve) => {
        exec(command, { cwd: execPath }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command error: ${error.message}`);
                resolve(`Command fail ho gayi: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`Command stderr: ${stderr}`);
                resolve(`Command ne yeh output diya (stderr): ${stderr}`);
                return;
            }
            console.log(`Command output: ${stdout}`);
            resolve(`Command kamyabi se chali. Output:\n${stdout}`);
        });
    });
}

async function createGithubRepo(args) {
    const { repoName } = args;
    if (!repoName) return "Error: 'repoName' zaroori hai.";
    try {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        console.log(`TOOL ACTION: GitHub repo "${repoName}" bana raha hoon...`);
        const response = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            private: false,
        });
        const repoUrl = response.data.html_url;
        return `Kamyabi! GitHub repository "${repoName}" ban gayi hai. Aap isay yahan dekh sakte hain: ${repoUrl}`;
    } catch (error) {
        console.error(`GitHub repo banane mein error: ${error.message}`);
        return `GitHub repo banane mein error aayi: ${error.message}`;
    }
}

module.exports = {
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
};
