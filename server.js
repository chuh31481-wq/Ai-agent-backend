// server.js (FINAL, CORRECTED, MULTI-KEY LEARNING AGENT)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;
const LOG_FILE = 'agent_log.json';

// --- Multi-Key Logic ---
const apiKeys = [];
for (let i = 1; i <= 10; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) {
        apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
    }
}
if (apiKeys.length === 0) {
    console.error("FATAL: No GEMINI_API_KEY_n secrets found.");
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
        { name: "createDirectory", description: "Creates a directory." },
        { name: "createFile", description: "Creates a file with content." },
        { name: "readFile", description: "Reads a file's content." },
        { name: "updateFile", description: "Updates a file's content." },
        { name: "executeCommand", description: "Executes a shell command." },
        { name: "createGithubRepo", description: "Creates a new GitHub repository." },
        { name: "commitAndPushChanges", description: "Commits and pushes all changes to the repository." },
        { name: "wait", description: "Pauses execution for a number of seconds." },
        { name: "logMission", description: "Logs the result of a completed mission to the agent's long-term memory.", parameters: { type: "object", properties: { missionData: { type: "string" } }, required: ["missionData"] } }
    ]
};

async function runAgent() {
    let previousLogs = "No previous missions found.";
    try {
        const logData = await tools.readFile({ fileName: LOG_FILE });
        const parsedLogs = JSON.parse(logData);
        const recentLogs = parsedLogs.slice(-5);
        previousLogs = `Here are summaries of your last 5 missions:\n${JSON.stringify(recentLogs, null, 2)}`;
    } catch (error) {
        console.log("Log file not found. This is the first mission.");
    }

    const initialPrompt = `Based on your past experiences below, create a step-by-step plan to achieve the user's goal. Your final step must always be to call 'logMission'.\n\nPast Experiences:\n${previousLogs}\n\nUser's New Goal: "${goal}"\n\nNow, begin. What is the first tool you will call?`;
    const history = [{ role: "user", parts: [{ text: initialPrompt }] }];
    const stepsTaken = [];
    let safetyLoop = 0;

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", tools: toolConfig, systemInstruction: "You are an autonomous AI agent. You must achieve the user's goal by calling tools. Your final action must be to call 'logMission' to record your work." });

            const result = await model.generateContent({ contents: history });
            const response = result.response;
            if (!response) { throw new Error("Model returned no response."); }

            const call = response.functionCalls()?.[0];

            if (call) {
                stepsTaken.push({ step: safetyLoop, tool: call.name, args: call.args });
                history.push({ role: "model", parts: [{ functionCall: call }] });

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                    history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
                    
                    if (call.name === 'logMission') {
                        console.log("\n✅ [MISSION LOGGED] Agent has saved its experience.");
                        await tools.commitAndPushChanges({ commitMessage: `log: Update agent log for mission` });
                        console.log("🏁 [AGENT FINISHED]");
                        return;
                    }
                } else {
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
                }
            } else {
                throw new Error("Agent got stuck and did not produce a tool call.");
            }

        } catch (error) {
            console.error(`❌ [ERROR] ${error.message}`);
            
            // === YEH HAI NAYA, SAHI ERROR HANDLING LOGIC ===
            if (error.message && (error.message.includes("429") || error.message.includes("503") || error.message.includes("quota"))) {
                console.log("Rate limit or server error detected. Switching to the next API key.");
                currentKeyIndex++;
                
                if (currentKeyIndex >= apiKeys.length) {
                    console.error("All API keys have been tried and failed. Stopping mission.");
                    const failureLog = { mission_id: `mission_all_keys_failed_${Date.now()}`, goal: goal, steps_taken: stepsTaken, final_outcome: `Failed. All API keys are rate-limited.`, learnings: "I need a valid API key or a paid plan to continue." };
                    await tools.logMission({ missionData: JSON.stringify(failureLog) });
                    await tools.commitAndPushChanges({ commitMessage: `log: Log mission failure due to all keys exhausted` });
                    return;
                }
                // Loop dobara shuru karo, taake agli key try ho sake
                continue; 
            } else {
                // Agar koi aur, na-theek hone wala error hai, to use log karke ruk jao
                console.error("An unrecoverable error occurred. Logging failure and stopping.");
                const failureLog = { mission_id: `mission_unrecoverable_error_${Date.now()}`, goal: goal, steps_taken: stepsTaken, final_outcome: `Failed with an unrecoverable error: ${error.message}`, learnings: "I encountered a critical error and must stop." };
                await tools.logMission({ missionData: JSON.stringify(failureLog) });
                await tools.commitAndPushChanges({ commitMessage: `log: Log mission failure due to unrecoverable error` });
                return;
            }
            // =================================================
        }
    }
    
    console.error("❌ Agent exceeded maximum steps. Logging timeout and stopping.");
    const timeoutLog = { mission_id: `mission_timeout_${Date.now()}`, goal: goal, steps_taken: stepsTaken, final_outcome: "Failed by timeout. I was stuck in a loop.", learnings: "I need to find a way to get out of loops." };
    await tools.logMission({ missionData: JSON.stringify(timeoutLog) });
    await tools.commitAndPushChanges({ commitMessage: `log: Log mission timeout` });
}

runAgent();
