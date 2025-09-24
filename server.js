// server.js (FINAL "ALL-KNOWING" AGENT VERSION)
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
    console.error("FATAL: No GEMINI API keys found.");
    process.exit(1);
}
let currentKeyIndex = 0;
// -------------------------

if (!goal) {
    console.log("AGENT_GOAL not found.");
    process.exit(0);
}

const toolConfig = {
    functionDeclarations: [
        { name: "createDirectory", description: "Creates a new, empty directory.", parameters: { type: "object", properties: { directoryName: { type: "string" } }, required: ["directoryName"] } },
        { name: "createFile", description: "Creates a file with specified content.", parameters: { type: "object", properties: { fileName: { type: "string" }, content: { type: "string" } }, required: ["fileName", "content"] } },
        { name: "readFile", description: "Reads the content of a file.", parameters: { type: "object", properties: { fileName: { type: "string" } }, required: ["fileName"] } },
        { name: "updateFile", description: "Updates a file with new content.", parameters: { type: "object", properties: { fileName: { type: "string" }, newContent: { type: "string" } }, required: ["fileName", "newContent"] } },
        { name: "executeCommand", description: "Executes a shell command.", parameters: { type: "object", properties: { command: { type: "string" }, directory: { type: "string" } }, required: ["command"] } },
        { name: "createGithubRepo", description: "Creates a new public GitHub repository.", parameters: { type: "object", properties: { repoName: { type: "string" } }, required: ["repoName"] } },
        { name: "commitAndPushChanges", description: "Commits and pushes all changes to the GitHub repository.", parameters: { type: "object", properties: { commitMessage: { type: "string" } }, required: ["commitMessage"] } },
        { name: "wait", description: "Pauses execution for a specified number of seconds.", parameters: { type: "object", properties: { seconds: { type: "number" } }, required: ["seconds"] } },
        { name: "remember", description: "Saves a key-value pair to the agent's long-term memory (memory.json).", parameters: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] } }
    ]
};

async function runAgent() {
    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
    
    // === YEH HAI NAYI "MEMORY" WALI HIDAYAT ===
    const initialPrompt = `
    You are an AI Software Engineer. Your task is to complete the user's goal.
    After you have finished the entire task (either by succeeding or failing), your final step MUST be to call the 'remember' tool.
    In the 'remember' tool, use a unique key for this mission (e.g., "mission_log_${Date.now()}").
    For the value, provide a JSON string that includes:
    1. "user_goal": The original goal you were given.
    2. "steps_taken": A brief summary of the tools you called.
    3. "final_outcome": A short description of whether you succeeded or failed, and why.
    4. "learnings": One sentence about what you learned.

    Here is the user's goal: "${goal}"
    `;
    // ==========================================

    const history = [{ role: "user", parts: [{ text: initialPrompt }] }];
    let safetyLoop = 0;

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                tools: toolConfig,
                systemInstruction: "You are a helpful and autonomous AI agent. Your goal is to achieve the user's request by thinking step-by-step and calling the available tools. Your final action must always be to call the 'remember' tool to log your mission.",
            });

            const result = await model.generateContent({ contents: history });
            
            const response = result.response;
            if (!response) {
                console.log("Model returned no response. Trying again.");
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
                    
                    // Agar agent ne apna kaam yaad rakh liya hai, to mission poora ho gaya
                    if (call.name === 'remember') {
                        console.log("\n✅ [MISSION LOGGED] Agent has saved its memory.");
                        console.log("🏁 [AGENT FINISHED]");
                        return;
                    }
                } else {
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
                }
            } else {
                // Agar AI ne tool call nahi kiya, to iska matlab hai woh phans gaya hai.
                // Use majboor karo ke woh apni nakami ko yaad rakhe.
                console.log("\n⚠️ [AI STUCK] Agent did not call a tool. Forcing it to remember its failure.");
                history.push({ role: "model", parts: [{ text: "I seem to be stuck. I should log my failure now." }] });
            }

        } catch (error) {
            console.error(`❌ [ERROR with Key #${currentKeyIndex + 1}]`, error.message);
            if (error.message.includes("429") || error.message.includes("503")) {
                console.log("Rate limit detected. Switching to the next API key.");
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                if (currentKeyIndex === 0) {
                    console.error("All API keys exhausted. Waiting for 60 seconds.");
                    await tools.wait({ seconds: 60 });
                }
                continue;
            } else {
                console.error("An unrecoverable error occurred. Forcing agent to remember the failure.");
                const failureLog = {
                    user_goal: goal,
                    steps_taken: "Error occurred before any tool could be successfully called.",
                    final_outcome: `Failed with an unrecoverable error: ${error.message}`,
                    learnings: "I need to be more careful about unrecoverable errors."
                };
                await tools.remember({ key: `mission_log_failure_${Date.now()}`, value: JSON.stringify(failureLog) });
                return;
            }
        }
    }
    console.error("❌ Agent exceeded maximum steps. Forcing agent to remember the failure.");
    const timeoutLog = {
        user_goal: goal,
        steps_taken: "Exceeded the maximum number of steps.",
        final_outcome: "Failed by timeout. I was likely stuck in a loop.",
        learnings: "I need to find a way to get out of loops or ask for help."
    };
    await tools.remember({ key: `mission_log_timeout_${Date.now()}`, value: JSON.stringify(timeoutLog) });
}

runAgent();
