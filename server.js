// server.js (FINAL, A-TEAM INSPIRED, ROBUST AGENT)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

// --- Multi-Key Logic for Google ---
const apiKeys = [];
for (let i = 1; i <= 10; i++) { if (process.env[`GEMINI_API_KEY_${i}`]) { apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]); } }
if (apiKeys.length === 0) { console.error("FATAL: No GEMINI API keys found."); process.exit(1); }
let currentKeyIndex = 0;
// --------------------------------

if (!goal) { console.log("AGENT_GOAL not found."); process.exit(0); }

// Behtar, tafseeli tool config
const toolConfig = {
    functionDeclarations: [
        { name: "createDirectory", description: "Creates a directory. Use 'directoryName' for the path.", parameters: { type: "object", properties: { directoryName: { type: "string" } }, required: ["directoryName"] } },
        { name: "createFile", description: "Creates a file. Use 'fileName' for the path and 'content' for the data.", parameters: { type: "object", properties: { fileName: { type: "string" }, content: { type: "string" } }, required: ["fileName", "content"] } },
        { name: "readFile", description: "Reads a file. Use 'fileName' for the path.", parameters: { type: "object", properties: { fileName: { type: "string" } }, required: ["fileName"] } },
        { name: "updateFile", description: "Updates a file. Use 'fileName' for the path and 'newContent' for the data.", parameters: { type: "object", properties: { fileName: { type: "string" }, newContent: { type: "string" } }, required: ["fileName", "newContent"] } },
        { name: "executeCommand", description: "Executes a shell command.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
        { name: "commitAndPushChanges", description: "Commits and pushes changes.", parameters: { type: "object", properties: { commitMessage: { type: "string" } }, required: ["commitMessage"] } },
        { name: "logMission", description: "Logs the mission outcome.", parameters: { type: "object", properties: { missionData: { type: "string" } }, required: ["missionData"] } },
        { name: "wait", description: "Pauses for a number of seconds." }
    ]
};

async function runAgent() {
    const history = [{ role: "user", parts: [{ text: `Your mission is to achieve the following goal: ${goal}` }] }];
    let safetyLoop = 0;

    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);

    while (safetyLoop < 40) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Google Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", tools: toolConfig });

            const result = await model.generateContent({ contents: history });
            const response = result.response;
            if (!response) { throw new Error("Model returned no response."); }

            const call = response.functionCalls()?.[0];

            if (call) {
                console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name} with arguments:`, call.args);
                history.push({ role: "model", parts: [{ functionCall: call }] });

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                    history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
                } else {
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
                }
            } else {
                console.log("\n✅ [FINAL RESPONSE] Mission complete. Final response from AI:");
                console.log(response.text());
                console.log("🏁 [AGENT FINISHED]");
                return;
            }

        } catch (error) {
            console.error(`❌ [ERROR on Key #${currentKeyIndex + 1}] ${error.message}`);
            if (error.message && (error.message.includes("429") || error.message.includes("quota"))) {
                console.log(`Rate limit detected. Switching to the next API key.`);
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                if (currentKeyIndex === 0) {
                    console.error("All API keys exhausted. Waiting for 60 seconds.");
                    await tools.wait({ seconds: 60 });
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
