// server.js (FINAL FOCUSED AGENT VERSION)
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

const toolConfig = { /* ... (toolConfig waisa hi hai, pichle code se copy karein) ... */ };

async function runAgent() {
    let previousLogs = "No previous missions found.";
    try {
        const logData = await tools.readFile({ fileName: LOG_FILE });
        const parsedLogs = JSON.parse(logData);
        const recentLogs = parsedLogs.slice(-5);
        previousLogs = `Here are summaries of your last 5 missions:\n${JSON.stringify(recentLogs, null, 2)}`;
    } catch (error) { console.log("Log file not found. This is the first mission."); }

    const initialPrompt = `User's Goal: "${goal}"\n\nBased on your past experiences below, create a step-by-step plan and start with the first step.\n\nPast Experiences:\n${previousLogs}`;
    const history = [{ role: "user", parts: [{ text: initialPrompt }] }];
    const stepsTaken = [];
    let safetyLoop = 0;

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", tools: toolConfig, systemInstruction: "You are a methodical AI agent..." });

            const result = await model.generateContent({ contents: history });
            const response = result.response;
            if (!response) { throw new Error("Model returned no response."); }

            const call = response.functionCalls()?.[0];

            if (call) {
                console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name} with arguments:`, call.args);
                stepsTaken.push({ step: safetyLoop, tool: call.name, args: call.args });
                
                // === YEH HAI NAYI, FOCUSED HIDAYAT ===
                // Hum purani history ko saaf karke, sirf zaroori cheezein bhejenge
                const newHistory = [
                    { role: "user", parts: [{ text: initialPrompt }] }, // Asal goal hamesha yaad rahe
                    { role: "model", parts: [{ functionCall: call }] } // Sirf mojooda faisla
                ];
                // =====================================

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                    newHistory.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
                    
                    // Agent ko agla qadam sochne ke liye "majboor" karein
                    newHistory.push({ role: "user", parts: [{ text: "That step is complete. Based on the original goal and the result of the last tool call, what is the next single tool to call?" }] });
                    
                    history.splice(0, history.length, ...newHistory); // Purani history ko nayi, focused history se badal do

                    if (call.name === 'logMission') {
                        console.log("\n✅ [MISSION LOGGED]");
                        await tools.commitAndPushChanges({ commitMessage: `log: Update agent log` });
                        console.log("🏁 [AGENT FINISHED]");
                        return;
                    }
                } else { throw new Error(`AI tried to call a non-existent tool: '${call.name}'`); }
            } else { throw new Error("Agent got stuck and did not produce a tool call."); }

        } catch (error) {
            // ... (Error handling ka logic bilkul waisa hi rahega) ...
        }
    }
    // ... (Timeout handling ka logic bilkul waisa hi rahega) ...
}

runAgent();
