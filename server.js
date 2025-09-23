// server.js (FINAL VERSION with Wait & Retry Logic)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

if (!goal) {
    console.log("AGENT_GOAL environment variable not found.");
    process.exit(0);
}

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("FATAL: GOOGLE_API_KEY is not configured.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const toolConfig = {
    functionDeclarations: [
        { name: "createDirectory", description: "Creates a new, empty directory.", parameters: { type: "object", properties: { directoryName: { type: "string" } }, required: ["directoryName"] } },
        { name: "createFile", description: "Creates a file with specified content.", parameters: { type: "object", properties: { fileName: { type: "string" }, content: { type: "string" } }, required: ["fileName", "content"] } },
        { name: "readFile", description: "Reads the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" } }, required: ["fileName"] } },
        { name: "updateFile", description: "Updates the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" }, newContent: { type: "string" } }, required: ["fileName", "newContent"] } },
        { name: "executeCommand", description: "Executes a shell command.", parameters: { type: "object", properties: { command: { type: "string" }, directory: { type: "string" } }, required: ["command"] } },
        { name: "createGithubRepo", description: "Creates a new public GitHub repository.", parameters: { type: "object", properties: { repoName: { type: "string" } }, required: ["repoName"] } },
        { name: "commitAndPushChanges", description: "Commits and pushes all changes to the GitHub repository.", parameters: { type: "object", properties: { commitMessage: { type: "string" } }, required: ["commitMessage"] } },
        // === NAYE TOOL KI INFORMATION ===
        { name: "wait", description: "Pauses the execution for a specified number of seconds. Useful for waiting out rate limits.", parameters: { type: "object", properties: { seconds: { type: "number" } }, required: ["seconds"] } }
    ]
};

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: toolConfig,
    systemInstruction: "You are a helpful AI agent. Your goal is to achieve the user's request by calling the available tools in a step-by-step manner. Do not generate code that calls the tools; instead, call the tools directly yourself. If you hit a rate limit, use the 'wait' tool to pause for 60 seconds before retrying.",
});

async function runAgent() {
    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
    const history = [{ role: "user", parts: [{ text: goal }] }];
    let safetyLoop = 0;

    while (safetyLoop < 20) { // Loop ko thora barha dete hain
        safetyLoop++;
        try {
            // === YEH HAI NAYA "SABR" WALA LOGIC ===
            const result = await model.generateContent({ contents: history });
            const response = result.response;
            const call = response.functionCalls()?.[0];

            if (!call) {
                console.log("\n✅ [FINAL RESPONSE]");
                console.log(response.text());
                console.log("🏁 [AGENT FINISHED]");
                return;
            }

            console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name} with arguments:`, call.args);
            history.push({ role: "model", parts: [{ functionCall: call }] });

            if (tools[call.name]) {
                const toolResult = await tools[call.name](call.args);
                console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
            } else {
                throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
            }
        } catch (error) {
            console.error(`❌ [ERROR in loop step ${safetyLoop}]`, error.message);
            // Agar rate limit ka error aaye, to agent ko "wait" karne ka kehte hain
            if (error.message.includes("429") || error.message.includes("Too Many Requests")) {
                console.log("Rate limit detected. Forcing agent to wait for 60 seconds.");
                history.push({
                    role: "function",
                    parts: [{ functionResponse: { name: "wait", response: { content: "Rate limit error occurred. Waiting for 60 seconds before retrying the last step." } } }]
                });
                await tools.wait({ seconds: 60 });
            } else {
                // Agar koi aur error hai, to ruk jao
                console.error("An unrecoverable error occurred. Stopping agent.");
                return;
            }
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
