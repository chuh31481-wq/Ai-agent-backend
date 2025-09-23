// tools.js (FINAL "UNLEASHED" VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

// Root directory of the project
const ROOT_DIR = process.cwd();

// Helper function to create a safe file path within the project
function getSafePath(fileName) {
    // Resolve the path to make it absolute
    const absolutePath = path.resolve(ROOT_DIR, fileName);
        
    // Security Check: Ensure the path is still within the project directory
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

async function createDirectory({ directoryName }) {
    const dirPath = getSafePath(directoryName);
    await fs.mkdir(dirPath, { recursive: true });
    return `Directory '${directoryName}' created successfully.`;
}

async function createFile({ fileName, content }) {
    const filePath = getSafePath(fileName);
    // Ensure parent directory exists before writing file
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
    // If directory is empty, use the root. Otherwise, use the specified directory.
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

async function commitAndPushChanges({ commitMessage }) {
    await executeCommand({ command: 'git config --global user.name "AI Agent"' });
    await executeCommand({ command: 'git config --global user.email "ai-agent@users.noreply.github.com"' });
    await executeCommand({ command: 'git add .' });
    const commitResult = await executeCommand({ command: `git commit -m '${commitMessage}'` });
    if (commitResult.includes("nothing to commit")) {
        return "No changes were detected to commit.";
    }
    await executeCommand({ command: 'git push origin main' });
    return `Successfully committed and pushed changes with message: "${commitMessage}"`;
}

// Export all tools for Node.js
module.exports = {
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
    commitAndPushChanges
};
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
    commitAndPushChanges // Naye tool ko yahan export karein
};
