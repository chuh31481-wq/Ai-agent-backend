// src/tools/git_manager.js
const { exec } = require('child_process');

module.exports = async function git_manager(args) {
    // args: { action, message }
    if (args.action === "commit") {
        return new Promise((resolve) => {
            exec('git add . && git commit -m "' + (args.message || "AI commit") + '" && git push', (err, stdout, stderr) => {
                if (err) resolve(`Git Error: ${stderr || err.message}`);
                else resolve(stdout);
            });
        });
    }
    return "git_manager: Unknown action";
};
