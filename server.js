// server.js (FINAL ACTION-ORIENTED VERSION)
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

const toolConfig = { /* ... (toolConfig waisa hi hai, isay change na karein) ... */ };

async function runAgent() {
    // === YEH HAI NAYI AUR AHEM TABDEELI ===
    // Hum goal ko ek "initial prompt" mein daal rahe hain jo agent ko foran kaam par lagaye
    const initialPrompt = `
    You are an AI agent. A user has given you a task.
    User's Task: "${goal}"
        
    Analyze this task and decide the very first tool you should call to begin working on it.
    Your response must be a direct tool call. Do not add any other text.
    `;
    // =====================================

    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
    const history = [{ role: "user", parts: [{ text: initialPrompt }] }]; // Agent ko naya, action-oriented prompt de rahe hain
    let safetyLoop = 0;

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
                
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro-latest",
                tools: toolConfig,
                systemInstruction: "You are a helpful AI agent. Your goal is to achieve the user's request by calling the available tools in a step-by-step manner. Your response should always be a tool call, unless you are completely finished with the task.",
            });

            const result = await model.generateContent({ contents: history });
                
            // ... (baqi ka poora logic waisa hi rahega) ...

        } catch (error) {
            // ... (error handling ka logic waisa hi rahega) ...
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
