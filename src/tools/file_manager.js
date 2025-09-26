// src/tools/file_manager.js
const fs = require('fs').promises;
const path = require('path');

module.exports = async function file_manager(args) {
    // Example: { action: "create", path: "file.txt", content: "..." }
    if (!args || !args.action || !args.path) return "file_manager: Missing required params";
    const absPath = path.resolve(process.cwd(), args.path);

    if (args.action === "create") {
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, args.content || "");
        return `Created file: ${args.path}`;
    }
    if (args.action === "update") {
        await fs.writeFile(absPath, args.content || "");
        return `Updated file: ${args.path}`;
    }
    if (args.action === "read") {
        return await fs.readFile(absPath, "utf-8");
    }
    if (args.action === "delete") {
        await fs.unlink(absPath);
        return `Deleted file: ${args.path}`;
    }
    return "file_manager: Unknown action";
};
