// server.js (FINAL MULTI-KEY VERSION)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

// === YEH HAI NAYA MULTI-KEY LOGIC ===
// Tamam API keys ko environment se uthao aur ek list mein daalo
const apiKeys = [];
for (let i = 1; i <= 10; i++) { // 1 se 10 tak keys check karo
    if (process.env[`GEMINI_API_KEY_${i}`]) {
        apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
    }
}

if (apiKeys.length === 0) {
    console.error("FATAL: No GEMINI_API_KEY_n secrets found in GitHub Actions secrets. Please add at least one key named GEMINI_API_KEY_1.");
    process.exit(1);
}

let currentKeyIndex = 0; // Shuruat pehli key se karo
// =====================================

if (!goal) {
    console.log("AGENT_GOAL environment variable not found. This script is designed to be run from a GitHub Action.");
    process.exit(0);
}

const toolConfig = {
    functionDeclarations: [
        { name: "createDirectory", description: "Creates a new, empty directory.", parameters: { type: "object", properties: { directoryName: { type: "string" } }, required: ["directoryName"] } },
        { name: "createFile", description: "Creates a file with specified content.", parameters: { type: "object", properties: { fileName: { type: "string" }, content: { type: "string" } }, required: ["fileName", "content"] } },
        { name: "readFile", description: "Reads the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" } }, required: ["fileName"] } },
        { name: "updateFile", description: "Updates the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" }, newContent: { type: "string" } }, required: ["fileName", "newContent"] } },
        { name: "executeCommand", description: "Executes a shell command.", parameters: { type: "object", properties: { command: { type: "string" }, directory: { type: "string" } }, required: ["command"] } },
        { name: "createGithubRepo", description: "Creates a new public GitHub repository.", parameters: { type: "object", properties: { repoName: { type: "string" } }, required: ["repoName"] } },
        { name: "commitAndPushChanges", description: "Commits and pushes all changes to the GitHub repository.", parameters: { type: "object", properties: { commitMessage: { type: "string" } }, required: ["commitMessage"] } },
        { name: "wait", description: "Pauses the execution for a specified number of seconds.", parameters: { type: "object", properties: { seconds: { type: "number" } }, required: ["seconds"] } }
    ]
};

async function runAgent() {
    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
    const history = [{ role: "user", parts: [{ text: goal }] }];
    let safetyLoop = 0;

    while (safetyLoop < 30) { // Loop ko thora barha dete hain taake complex kaam ho sakein
        safetyLoop++;
        try {
            // === KEY ROTATION LOGIC ===
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                tools: toolConfig,
                systemInstruction: "You are a helpful AI agent. Your goal is to achieve the user's request by calling the available tools in a step-by-step manner. Do not generate code that calls the tools; instead, call the tools directly yourself. If you hit a rate limit, you will be switched to a new key automatically.",
            });
            // ==========================

            const result = await model.generateContent({ contents: history });
                
            const response = result.response;
            const call = response.functionCalls()?.[0];

            if (!call) {
                console.log("\n✅ [FINAL RESPONSE]");
                console.log(response.text());
                console.log("🏁 [AGENT FINISHED]");
                return;
            }

            console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name}`);
            history.push({ role: "model", parts: [{ functionCall: call }] });

            if (tools[call.name]) {
                const toolResult = await tools[call.name](call.args);
                console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
            } else {
                throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
            }

        } catch (error) {
            console.error(`❌ [ERROR with Key #${currentKeyIndex + 1}]`, error.message);
                
            if (error.message && (error.message.includes("429") || error.message.includes("503"))) {
                console.log("Rate limit detected. Switching to the next API key.");
                currentKeyIndex++; // Agli key par jao
                    
                if (currentKeyIndex >= apiKeys.length) {
                    console.error("All API keys have been rate-limited. Waiting for 60 seconds as a last resort.");
                    await tools.wait({ seconds: 60 });
                    currentKeyIndex = 0; // Wapas pehli key se shuru karo
                }
                continue; // Loop dobara shuru karo
            } else {
                console.error("An unrecoverable error occurred. Stopping agent.");
                return;
            }
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
