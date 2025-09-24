// tools.js (FOCUSED GOD-MODE VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");

const ROOT_DIR = process.cwd();
const MEMORY_FILE = path.join(ROOT_DIR, 'memory.json');

function getSafePath(fileName) {
    const absolutePath = path.resolve(ROOT_DIR, fileName);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

// --- Tamam Zaroori Tools ---
async function createDirectory({ directoryName }) { /* ... (code waisa hi) ... */ }
async function createFile({ fileName, content }) { /* ... (code waisa hi) ... */ }
async function readFile({ fileName }) { /* ... (code waisa hi) ... */ }
async function updateFile({ fileName, newContent }) { /* ... (code waisa hi) ... */ }
function executeCommand({ command, directory = '' }) { /* ... (code waisa hi) ... */ }
async function createGithubRepo({ repoName }) { /* ... (code waisa hi) ... */ }
async function commitAndPushChanges({ commitMessage }) { /* ... (code waisa hi) ... */ }
async function wait({ seconds }) { /* ... (code waisa hi) ... */ }

// === NAYI SUPERPOWER: LONG-TERM MEMORY ===
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

// Export all tools
module.exports = {
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
    commitAndPushChanges,
    wait,
    remember // Naya tool
};
