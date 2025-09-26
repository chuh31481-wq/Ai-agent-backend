// src/tools/tool_manager.js
// Registers and auto-creates (self-improves) tools as needed

const fs = require('fs');
const path = require('path');

// Registry for all loaded tools
let toolCache = {};

function getAllTools() {
    if (Object.keys(toolCache).length === 0) {
        // Load all .js files in this directory (except tool_manager.js itself)
        const files = fs.readdirSync(__dirname)
            .filter(f => f.endsWith('.js') && f !== 'tool_manager.js');
        for (const file of files) {
            const toolName = file.replace('.js', '');
            try {
                toolCache[toolName] = require(path.join(__dirname, file));
            } catch (e) {
                // skip broken modules
            }
        }
    }
    return toolCache;
}

// If tool missing, auto-create a stub (self-improvement)
async function ensureToolExists(toolName, force = false) {
    const filePath = path.join(__dirname, `${toolName}.js`);
    if (!fs.existsSync(filePath) || force) {
        const stub = `
module.exports = async function ${toolName}(args) {
    // TODO: Implement tool '${toolName}'
    return "Stub: Tool '${toolName}' was auto-created. Please implement.";
};
`;
        fs.writeFileSync(filePath, stub, 'utf-8');
        delete require.cache[require.resolve(filePath)];
    }
    // Refresh cache
    toolCache = {};
    getAllTools();
}

module.exports = { getAllTools, ensureToolExists };