// tools.js (FINAL VERSION with Commit & Push tool)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

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

function executeCommand({ command, directory = '' }) {
    const execDir = directory ? getSafePath(directory) : process.cwd();
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

// === YEH HAI NAYI SUPERPOWER KA CODE ===
async function commitAndPushChanges({ commitMessage }) {
    console.log("Configuring Git user for the commit...");
    await executeCommand({ command: 'git config --global user.name "AI Agent"' });
    await executeCommand({ command: 'git config --global user.email "ai-agent@users.noreply.github.com"' });

    console.log("Adding changes to Git staging area...");
    const addResult = await executeCommand({ command: 'git add .' });
    console.log(addResult);

    console.log("Committing changes...");
    // Use single quotes to handle commit messages with special characters
    const commitResult = await executeCommand({ command: `git commit -m '${commitMessage}'` });
    console.log(commitResult);

    if (commitResult.includes("nothing to commit")) {
        return "No changes were detected to commit.";
    }

    console.log("Pushing changes to the main branch on GitHub...");
    const pushResult = await executeCommand({ command: 'git push origin main' });
    console.log(pushResult);

    return `Successfully committed and pushed changes with message: "${commitMessage}"`;
}
// =====================================

// Node.js ke liye sab tools ko export karein
module.exports = {
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
    commitAndPushChanges // Naye tool ko yahan export karein
};
