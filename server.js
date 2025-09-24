// server.js (FINAL, RELIABLE, AND LEARNING AGENT)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;
const LOG_FILE = 'agent_log.json';

// --- Multi-Key Logic ---
const apiKeys = [];
for (let i = 1; i <= 10; i++) { if (process.env[`GEMINI_API_KEY_${i}`]) { apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]); } }
if (apiKeys.length === 0) { console.error("FATAL: No GEMINI API keys found."); process.exit(1); }
let currentKeyIndex = 0;
// -------------------------

if (!goal) { console.log("AGENT_GOAL not found."); process.exit(0); }

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
    // === YEH HAI NAYI, BEHTAR HIDAYAT ===
    const initialPrompt = `
    User's Goal: "${goal}"
    
    Based on this goal, create a step-by-step plan. Execute the plan by calling the necessary tools.
    After all other steps are complete, your final step MUST be to call the 'logMission' tool to record your work.
    For the 'logMission' tool, provide a JSON string with 'goal', 'outcome', and 'learnings'.
    
    Now, begin. What is the first tool call?
    `;
    // ===================================

    const history = [{ role: "user", parts: [{ text: initialPrompt }] }];
    const stepsTaken = [];
    let safetyLoop = 0;

    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", tools: toolConfig });

            const result = await model.generateContent({ contents: history });
            const response = result.response;
            if (!response) { throw new Error("Model returned no response."); }

            const call = response.functionCalls()?.[0];

            if (call) {
                console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name} with arguments:`, call.args);
                stepsTaken.push({ step: safetyLoop, tool: call.name });
                history.push({ role: "model", parts: [{ functionCall: call }] });

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                    history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });

                    // Agar agent ne apna kaam yaad rakh liya hai, to mission poora ho gaya
                    if (call.name === 'logMission') {
                        console.log("\n✅ [MISSION LOGGED] Agent has saved its experience.");
                        await tools.commitAndPushChanges({ commitMessage: `log: Update agent log` });
                        console.log("🏁 [AGENT FINISHED]");
                        return;
                    }
                } else {
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
                }
            } else {
                // Agar AI ne tool call nahi kiya, to iska matlab hai woh phans gaya hai.
                console.log("\n⚠️ [AI STUCK] Agent did not call a tool. Forcing it to log its failure.");
                throw new Error("Agent got stuck and did not produce a tool call.");
            }

        } catch (error) {
            // ... (Error handling ka logic bilkul waisa hi rahega, jo aakhir mein logMission call karega) ...
        }
    }
    // ... (Timeout handling ka logic bilkul waisa hi rahega, jo aakhir mein logMission call karega) ...
}

runAgent();
