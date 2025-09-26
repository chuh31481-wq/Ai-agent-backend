// src/memory/long_term_memory.js
const fs = require('fs');
const path = require('path');
const MEMORY_FILE = path.join(__dirname, '../../agent_memory.json');

function getMemory() {
    try {
        return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function saveMemory(mem) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

module.exports = { getMemory, saveMemory };