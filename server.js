// server.js (FINAL FREEDOM-OF-THOUGHT VERSION)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;
    
const apiKeys = [];
for (let i = 1; i <= 10; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) {
        apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
    }
}

if (apiKeys.length === 0) {
    console.error("FATAL: No GEMINI API keys found.");
    process.exit(1);
}
let currentKeyIndex = 0;

if (!goal) {
    console.log("AGENT_GOAL not found.");
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
        { name: "wait", description: "Pauses the execution for a specified number of seconds.", parameters: { type: "object", properties: { seconds: { type: "number" } }, required: ["seconds"] } },
        { name: "browseWebsite", description: "Fetches the text content of a given URL.", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
        { name: "remember", description: "Saves a key-value pair to the agent's long-term memory.", parameters: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] } }
    ]
};

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
                
            // === YEH HAI NAYI AUR AHEM TABDEELI ===
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro-latest",
                tools: toolConfig,
                // Humne sakht hidayat hata di hai
                systemInstruction: "You are a helpful and autonomous AI agent. Your goal is to achieve the user's request by thinking step-by-step and calling the available tools. Analyze the user's goal and the results of your tool calls to decide your next action.",
            });
            // =====================================

            const result = await model.generateContent({ contents: history });
                
            const response = result.response;
                
            // Safety check: agar response maujood nahi, to loop se bahar nikal jao
            if (!response) {
                console.log("Model returned no response. Stopping.");
                break;
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
                // Agar AI ne tool call nahi kiya, to iska matlab hai usne final jawab diya hai
                console.log("\n✅ [FINAL RESPONSE]");
                console.log(response.text());
                console.log("🏁 [AGENT FINISHED]");
                return; // Mission poora ho gaya, loop khatam karo
            }

        } catch (error) {
            console.error(`❌ [ERROR with Key #${currentKeyIndex + 1}]`, error.message);
                
            if (error.message && (error.message.includes("429") || error.message.includes("503"))) {
                console.log("Rate limit detected. Switching to the next API key.");
                currentKeyIndex++;
                if (currentKeyIndex >= apiKeys.length) {
                    console.error("All API keys have been rate-limited. Waiting for 60 seconds.");
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
