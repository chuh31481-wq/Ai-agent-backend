// src/tools/code_executor.js
const { exec } = require('child_process');

module.exports = async function code_executor(args) {
    // args: { command: "ls -la" }
    return new Promise((resolve) => {
        exec(args.command, (err, stdout, stderr) => {
            if (err) resolve(`Error: ${stderr || err.message}`);
            else resolve(stdout);
        });
    });
};
