// tools.js (GOD MODE VERSION)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { Octokit } = require("@octokit/rest");
const axios = require('axios'); // Internet browsing ke liye

const ROOT_DIR = process.cwd();
const MEMORY_FILE = path.join(ROOT_DIR, 'memory.json');

function getSafePath(fileName) {
    const absolutePath = path.resolve(ROOT_DIR, fileName);
    if (!absolutePath.startsWith(ROOT_DIR)) {
        throw new Error(`Security Error: Attempted to access a path outside the project directory: ${fileName}`);
    }
    return absolutePath;
}

// ... (createDirectory, createFile, readFile, updateFile, executeCommand, createGithubRepo, commitAndPushChanges, wait... yeh sab tools waise hi rahenge) ...
// (For brevity, I'm omitting the functions that are not changing. You should paste the full code from the previous step and then add the new ones below)

// === NAYI SUPERPOWER #1: INTERNET ACCESS ===
async function browseWebsite({ url }) {
    try {
        console.log(`Browsing website: ${url}`);
        const response = await axios.get(url);
        // HTML tags ko hatakar sirf saaf text wapas bhejein
        const cleanText = response.data.replace(/<[^>]*>/g, ' ').replace(/\s\s+/g, ' ').trim();
        return `Successfully browsed ${url}. Content (first 2000 chars): ${cleanText.substring(0, 2000)}`;
    } catch (error) {
        return `Error browsing website ${url}: ${error.message}`;
    }
}

// === NAYI SUPERPOWER #2: LONG-TERM MEMORY ===
async function remember({ key, value }) {
    let memory = {};
    try {
        const data = await fs.readFile(MEMORY_FILE, 'utf-8');
        memory = JSON.parse(data);
    } catch (e) {
        // Agar file nahi hai, to khali memory se shuru karein
        console.log("Memory file not found, creating a new one.");
    }
    memory[key] = value;
    await fs.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
    return `Successfully remembered the value for key: '${key}'.`;
}

// Export all tools, including the new ones
module.exports = {
    // ... (purane tamam tools ke naam yahan likhein) ...
    createDirectory,
    createFile,
    readFile,
    updateFile,
    executeCommand,
    createGithubRepo,
    commitAndPushChanges,
    wait,
    browseWebsite, // Naya tool
    remember       // Naya tool
};
