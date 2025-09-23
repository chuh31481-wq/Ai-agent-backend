// server.js (GitHub Actions Version - FINAL FIX)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

if (!goal) {
    console.log("AGENT_GOAL environment variable not found. This script is designed to be run from a GitHub Action triggered by an issue.");
    process.exit(0); // Khamoshi se band ho jao
}

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("FATAL: GOOGLE_API_KEY is not configured in GitHub Secrets.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini ke liye tools ki list banayein
const functionDeclarations = [
    { name: "createDirectory", description: "Creates a new, empty directory in the workspace.", parameters: { type: "object", properties: { directoryName: { type: "string" } }, required: ["directoryName"] } },
    { name: "createFile", description: "Creates a file with specified content.", parameters: { type: "object", properties: { fileName: { type: "string" }, content: { type: "string" } }, required: ["fileName", "content"] } },
    { name: "readFile", description: "Reads the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" } }, required: ["fileName"] } },
    { name: "updateFile", description: "Updates the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" }, newContent: { type: "string" } }, required: ["fileName", "newContent"] } },
    { name: "executeCommand", description: "Executes a shell command.", parameters: { type: "object", properties: { command: { type: "string" }, directory: { type: "string" } }, required: ["command"] } },
    { name: "createGithubRepo", description: "Creates a new public GitHub repository.", parameters: { type: "object", properties: { repoName: { type: "string" } }, required: ["repoName"] } }
];

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: { functionDeclarations }
});

async function runAgent() {
    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
    const history = [{ role: "user", parts: [{ text: goal }] }];
    let safetyLoop = 0;

    while (safetyLoop < 10) {
        safetyLoop++;
        const result = await model.generateContent({ contents: history });
        const response = result.response;
        const call = response.functionCalls()?.[0];

        if (!call) {
            console.log("\n✅ [FINAL RESPONSE]");
            console.log("---------------------------------");
            console.log(response.text());
            console.log("---------------------------------");
            console.log("🏁 [AGENT FINISHED]");
            return;
        }

        console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name} with arguments:`, call.args);
        history.push({ role: "model", parts: [{ functionCall: call }] });

        if (tools[call.name]) {
            const toolResult = await tools[call.name](call.args);
            console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
            history.push({
                role: "function",
                parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }]
            });
        } else {
            const errorMsg = `Error: AI tried to call a non-existent tool: '${call.name}'`;
            console.error(`❌ ${errorMsg}`);
            history.push({
                role: "function",
                parts: [{ functionResponse: { name: call.name, response: { content: errorMsg } } }]
            });
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping to prevent infinite loop.");
}

runAgent();

// YAHAN SE FALTU CODE HATA DIYA GAYA HAI
