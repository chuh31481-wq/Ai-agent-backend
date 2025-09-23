// server.js (FINAL VERSION with System Prompt)
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

const functionDeclarations = [ /* ... (list of tools is the same) ... */ ];

// === YEH HAI NAYI AUR AHEM TABDEELI ===
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: { functionDeclarations },
    // Hum AI ko ek buniyadi hidayat de rahe hain
    systemInstruction: "You are a helpful AI agent. Your goal is to achieve the user's request by calling the available tools in a step-by-step manner. Do not generate code that calls the tools; instead, call the tools directly yourself.",
});
// =====================================

async function runAgent() {
    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);
        
    // Hum user ke goal ko history mein daal rahe hain
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
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
