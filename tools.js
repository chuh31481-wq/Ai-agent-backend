// tools.js (FINAL, CORE TOOLS ONLY)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();

// Helper function to ensure file paths are safe and within the project
function getSafePath(filePath) {
    const absolutePath = path.resolve(ROOT_DIR, filePath);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${filePath}`);
    }
    return absolutePath;
}

// --- Buniyadi Tools ---

async function readFile({ fileName }) {
    if (!fileName) { return "Error: You must provide the 'fileName' parameter."; }
    const filePath = getSafePath(fileName);
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        return `Error reading file ${fileName}: ${error.message}`;
    }
}

async function updateFile({ fileName, content }) {
    if (!fileName || content === undefined) { return "Error: You must provide 'fileName' and 'content' parameters."; }
    const filePath = getSafePath(fileName);
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content);
        return `File '${fileName}' updated successfully.`;
    } catch (error) {
        return `Error updating file ${fileName}: ${error.message}`;
    }
}

function executeCommand({ command }) {
    if (!command) { return "Error: You must provide the 'command' parameter."; }
    return new Promise((resolve) => {
        exec(command, { cwd: ROOT_DIR }, (error, stdout, stderr) => {
            if (error) {
                resolve(`Execution Error: ${error.message}\nStderr: ${stderr}`);
            } else {
                resolve(`Command Output:\n${stdout}`);
            }
        });
    });
}

async function commitAndPushChanges({ commitMessage }) {
    if (!commitMessage) { return "Error: You must provide the 'commitMessage' parameter."; }
    try {
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
    } catch (error) {
        return `Error during git operations: ${error.message}`;
    }
}

// Yehi woh tools hain jo agent ko apne aap ko behtar banane ke liye chahiye
module.exports = {
    readFile,
    updateFile,
    executeCommand,
    commitAndPushChanges,
};
