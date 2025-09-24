// server.js (GOD MODE VERSION)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;
// ... (Multi-key logic waisa hi rahega) ...
const apiKeys = [];
for (let i = 1; i <= 10; i++) { if (process.env[`GEMINI_API_KEY_${i}`]) { apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]); } }
if (apiKeys.length === 0) { console.error("FATAL: No GEMINI API keys found."); process.exit(1); }
let currentKeyIndex = 0;

if (!goal) { console.log("AGENT_GOAL not found."); process.exit(0); }

// === NAYI SUPERPOWERS KI INFORMATION ===
const toolConfig = {
    functionDeclarations: [
        // ... (purane tamam tools ki information yahan likhein) ...
        { name: "createFile", description: "Creates a file with content.", /*...*/ },
        { name: "readFile", description: "Reads a file.", /*...*/ },
        { name: "updateFile", description: "Updates a file.", /*...*/ },
        { name: "executeCommand", description: "Executes a shell command.", /*...*/ },
        { name: "createGithubRepo", description: "Creates a GitHub repo.", /*...*/ },
        { name: "commitAndPushChanges", description: "Commits and pushes changes.", /*...*/ },
        { name: "wait", description: "Pauses execution.", /*...*/ },
        // Naye tools ki information add karein
        { name: "browseWebsite", description: "Fetches the text content of a given URL.", parameters: { type: "object", properties: { url: { type: "string", description: "The URL of the website to browse." } }, required: ["url"] } },
        { name: "remember", description: "Saves a key-value pair to the agent's long-term memory.", parameters: { type: "object", properties: { key: { type: "string", description: "The key to remember." }, value: { type: "string", description: "The value to associate with the key." } }, required: ["key", "value"] } }
    ]
};
// =====================================

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
                model: "gemini-1.5-pro-latest", // Flash se Pro par upgrade
                tools: toolConfig,
                systemInstruction: "You are a highly intelligent and autonomous AI agent. Your goal is to achieve the user's request by thinking step-by-step and calling the available tools. If you hit a rate limit, you will be switched to a new key automatically. Use your memory and browsing capabilities to solve complex problems.",
            });
            // =====================================

            const result = await model.generateContent({ contents: history });
                
            // ... (baqi ka poora logic waisa hi rahega jaisa pichle message mein tha) ...

        } catch (error) {
            // ... (error handling ka logic waisa hi rahega) ...
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
