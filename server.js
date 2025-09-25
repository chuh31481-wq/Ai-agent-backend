// server.js (FINAL, GOD-TIER, SELF-IMPROVING AGENT)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

// --- Multi-Key Logic ---
const apiKeys = [];
for (let i = 1; i <= 10; i++) { if (process.env[`GEMINI_API_KEY_${i}`]) { apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]); } }
if (apiKeys.length === 0) { console.error("FATAL: No GEMINI API keys found."); process.exit(1); }
let currentKeyIndex = 0;
// ---------------------

if (!goal) { console.log("AGENT_GOAL not found."); process.exit(0); }

// Sirf buniyadi tools ki information, taake agent naye tools banane par majboor ho
const toolConfig = {
    functionDeclarations: [
        { name: "readFile", description: "Reads the content of a file." },
        { name: "updateFile", description: "Updates (or creates) a file with new content." },
        { name: "executeCommand", description: "Executes a shell command." },
        { name: "commitAndPushChanges", description: "Commits and pushes all changes to the repository." },
    ]
};

async function runAgent() {
    let history = [{ role: "user", parts: [{ text: goal }] }];
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
                    console.log(`Tool Output: ${String(toolResult).substring(0, 500)}...`);
                    history.push({ role: "function", parts: [{ functionResponse: { name: call.name, response: { content: String(toolResult) } } }] });
                } else {
                    // === YEH HAI ASAL JADOO (SELF-IMPROVEMENT LOGIC) ===
                    console.warn(`⚠️ [SELF-IMPROVEMENT] Agent tried to call a non-existent tool: '${call.name}'. Attempting to create it.`);
                    
                    const metaGoal = `
                        You are a master Node.js developer. Your current task is to add a new tool to your own source code because you tried to use a tool that doesn't exist.
                        The missing tool is named '${call.name}'.
                        The arguments you tried to pass to it were: ${JSON.stringify(call.args)}.

                        Follow these steps precisely:
                        1.  First, you MUST read your own tools file, which is located at 'tools.js', to understand its structure and how functions are exported.
                        2.  Based on the name '${call.name}' and the arguments, write the complete, correct, and robust Node.js code for this new async function. It must use the existing 'getSafePath' and 'ROOT_DIR' conventions if it deals with files. It must handle errors and return a meaningful string.
                        3.  Read the 'tools.js' file again.
                        4.  Use the 'updateFile' tool to append the new function's code to the END of 'tools.js', just BEFORE the final 'module.exports = {' line.
                        5.  After adding the function, you MUST update the 'module.exports' object in 'tools.js' to include the new tool '${call.name}'. Read the file, modify the exports block, and use 'updateFile' to save it.
                        6.  Finally, commit your changes to your own source code with the commit message: "feat(self-improvement): Create and add new tool '${call.name}'".
                        
                        After you have successfully committed the changes, the system will restart, and your new tool will be available. Do not try to call the original missing tool again in this meta-mission. Just focus on creating and saving it.
                    `;
                    
                    // Purani history ko bhool jao aur naye, "meta" mission par lag jao
                    history = [{ role: "user", parts: [{ text: metaGoal }] }];
                    console.log("Switching to meta-task: Create the missing tool.");
                    continue; // Loop dobara shuru karo, is naye meta-goal ke saath
                    // =======================================================
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
