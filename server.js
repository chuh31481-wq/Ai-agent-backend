// server.js (FINAL FOCUSED GOD-MODE VERSION)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

// --- Multi-Key Logic ---
const apiKeys = [];
for (let i = 1; i <= 10; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) {
        apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
    }
}

if (apiKeys.length === 0) {
    console.error("FATAL: No GEMINI_API_KEY_n secrets found in GitHub Actions secrets. Please add at least one key named GEMINI_API_KEY_1.");
    process.exit(1);
}

let currentKeyIndex = 0;
// -------------------------

if (!goal) {
    console.log("AGENT_GOAL environment variable not found. This script is designed to be run from a GitHub Action.");
    process.exit(0);
}

// === NAYI SUPERPOWERS KI MUKAMMAL INFORMATION ===
const toolConfig = {
    functionDeclarations: [
        { name: "createDirectory", description: "Creates a new, empty directory in the repository.", parameters: { type: "object", properties: { directoryName: { type: "string", description: "The name of the directory to create." } }, required: ["directoryName"] } },
        { name: "createFile", description: "Creates a new file with specified content in the repository.", parameters: { type: "object", properties: { fileName: { type: "string", description: "The path and name of the file." }, content: { type: "string", description: "The content to write into the file." } }, required: ["fileName", "content"] } },
        { name: "readFile", description: "Reads the entire content of a specified file.", parameters: { type: "object", properties: { fileName: { type: "string", description: "The path and name of the file to read." } }, required: ["fileName"] } },
        { name: "updateFile", description: "Updates an existing file with new content.", parameters: { type: "object", properties: { fileName: { type: "string", description: "The path and name of the file to update." }, newContent: { type: "string", description: "The new content to write." } }, required: ["fileName", "newContent"] } },
        { name: "executeCommand", description: "Executes a shell command in the repository's root directory.", parameters: { type: "object", properties: { command: { type: "string", description: "The command to execute." } }, required: ["command"] } },
        { name: "createGithubRepo", description: "Creates a new public GitHub repository on the user's account.", parameters: { type: "object", properties: { repoName: { type: "string", description: "The name of the new repository." } }, required: ["repoName"] } },
        { name: "commitAndPushChanges", description: "Commits and pushes all current changes to the GitHub repository.", parameters: { type: "object", properties: { commitMessage: { type: "string", description: "A descriptive message for the commit." } }, required: ["commitMessage"] } },
        { name: "wait", description: "Pauses the execution for a specified number of seconds. Useful for waiting out rate limits.", parameters: { type: "object", properties: { seconds: { type: "number", description: "The number of seconds to wait." } }, required: ["seconds"] } },
        { name: "remember", description: "Saves a key-value pair to the agent's long-term memory file (memory.json).", parameters: { type: "object", properties: { key: { type: "string", description: "The key under which to save the information." }, value: { type: "string", description: "The information to save." } }, required: ["key", "value"] } }
    ]
};
// ==========================================

async function runAgent() {
    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
    const history = [{ role: "user", parts: [{ text: goal }] }];
    let safetyLoop = 0;

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
                
            // === BEHTAR DIMAGH (GEMINI 1.5 PRO) ===
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash"
                tools: toolConfig,
                systemInstruction: "You are a highly intelligent and autonomous AI agent. Your goal is to achieve the user's request by thinking step-by-step and calling the available tools. Analyze the user's goal and the results of your tool calls to decide your next action. If you hit a rate limit, you will be switched to a new key automatically.",
            });
            // =====================================

            const result = await model.generateContent({ contents: history });
                
            const response = result.response;
            if (!response) {
                console.log("Model returned no response. Trying again with the next key.");
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                continue;
            }

            const call = response.functionCalls()?.[0];

            if (call) {
                console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name}`);
                history.push({ role: "model", parts: [{ functionCall: call }] });

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                    history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
                } else {
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
                }
            } else {
                console.log("\n✅ [FINAL RESPONSE]");
                console.log(response.text());
                console.log("🏁 [AGENT FINISHED]");
                return;
            }

        } catch (error) {
            console.error(`❌ [ERROR with Key #${currentKeyIndex + 1}]`, error.message);
                
            if (error.message && (error.message.includes("429") || error.message.includes("503"))) {
                console.log("Rate limit detected. Switching to the next API key.");
                currentKeyIndex++;
                if (currentKeyIndex >= apiKeys.length) {
                    console.error("All API keys have been rate-limited. Waiting for 60 seconds as a last resort.");
                    await tools.wait({ seconds: 60 });
                    currentKeyIndex = 0;
                }
                continue;
            } else {
                console.error("An unrecoverable error occurred. Stopping agent.");
                return;
            }
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
