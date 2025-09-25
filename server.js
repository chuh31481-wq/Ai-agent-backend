// server.js (FINAL, GOD-TIER, SELF-IMPROVING AGENT)
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

// --- Multi-Key Logic for Google ---
const apiKeys = [];
for (let i = 1; i <= 10; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) {
        apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
    }
}
if (apiKeys.length === 0) {
    console.error("FATAL: No GEMINI_API_KEY_n secrets found in GitHub Actions secrets. Please add at least one key named GEMINI_API_KEY_1.");
    process.exit(1);
}
let currentKeyIndex = 0;
// --------------------------------

if (!goal) {
    console.log("AGENT_GOAL environment variable not found. This script is designed to be run from a GitHub Action.");
    process.exit(0);
}

const toolConfig = {
    functionDeclarations: [
        { name: "createDirectory", description: "Creates a new, empty directory in the repository." },
        { name: "createFile", description: "Creates a new file with specified content in the repository." },
        { name: "readFile", description: "Reads the entire content of a specified file." },
        { name: "updateFile", description: "Updates an existing file with new content." },
        { name: "executeCommand", description: "Executes a shell command in the repository's root directory." },
        { name: "createGithubRepo", description: "Creates a new public GitHub repository on the user's account." },
        { name: "commitAndPushChanges", description: "Commits and pushes all current changes to the GitHub repository." },
        { name: "wait", description: "Pauses the execution for a specified number of seconds. Useful for waiting out rate limits." },
        { name: "logMission", description: "Logs the result of a completed mission to the agent's long-term memory.", parameters: { type: "object", properties: { missionData: { type: "string" } }, required: ["missionData"] } }
    ]
};

async function runAgent() {
    let history = [{ role: "user", parts: [{ text: goal }] }];
    let safetyLoop = 0;

    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);

    while (safetyLoop < 40) { // Loop thora aur barha dete hain
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
                    // === YEH HAI ASAL JADOO (SELF-IMPROVEMENT LOGIC) ===
                    console.warn(`⚠️ [SELF-IMPROVEMENT] Agent tried to call a non-existent tool: '${call.name}'. Attempting to create it.`);
                    
                    const metaGoal = `
                        The user wants to use a tool named '${call.name}' but it does not exist.
                        Your task is to create this new tool.
                        1. Read the 'tools.js' file to understand the existing code structure.
                        2. Write the complete Node.js code for the new function '${call.name}'. It should take the arguments ${JSON.stringify(call.args)} and perform the expected action. Make sure to handle potential errors and return a meaningful string.
                        3. Append this new function code to the 'tools.js' file using the 'updateFile' tool. You must read the file first, then append the new function at the end, before the 'module.exports' line.
                        4. After updating 'tools.js', you MUST also update the 'module.exports' object at the end of the file to include the new function '${call.name}'.
                        5. After successfully modifying the files, commit the changes with the message "feat: Self-create new tool '${call.name}'".
                        After this, the main process will be restarted to use your new tool.
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
                currentKeyIndex++;
                
                if (currentKeyIndex >= apiKeys.length) {
                    console.error("All API keys have been rate-limited. Waiting for 60 seconds as a last resort.");
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
