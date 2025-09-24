// server.js (FINAL, SIMPLE, DEEPSEEK-POWERED AGENT)
require('dotenv').config();
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!goal || !openRouterApiKey) {
    console.error("FATAL: AGENT_GOAL or OPENROUTER_API_KEY is not set.");
    process.exit(1);
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
        { name: "logMission", description: "Logs the result of a completed mission.", parameters: { type: "object", properties: { missionData: { type: "string" } }, required: ["missionData"] } }
    ]
};

async function callOpenRouter(history) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openRouterApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            "model": "mistralai/mistral-7b-instruct:free", // Mistral 7B is more reliable for tool use
            "messages": history,
            "tools": toolConfig.functionDeclarations.map(tool => ({ type: "function", function: tool })),
            "tool_choice": "auto"
        })
    });
    if (!response.ok) { throw new Error(`OpenRouter API Error: ${response.statusText} - ${await response.text()}`); }
    return await response.json();
}

async function runAgent() {
    // Bilkul saada history, jaisa shuru mein kamyab hua tha
    const history = [{ role: "user", content: goal }];
    let safetyLoop = 0;

    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);

    while (safetyLoop < 30) {
        safetyLoop++;
        try {
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Calling Mistral 7B (Free)`);
            
            const responseJson = await callOpenRouter(history);
            const message = responseJson.choices[0].message;

            if (message.tool_calls && message.tool_calls.length > 0) {
                const call = message.tool_calls[0].function;
                call.args = JSON.parse(call.arguments);

                console.log(`\n⚙️ [AI DECISION] Calling tool: ${call.name} with arguments:`, call.args);
                history.push({ role: "assistant", tool_calls: message.tool_calls });

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`Tool Output: ${String(toolResult).substring(0, 300)}...`);
                    history.push({ role: "tool", tool_call_id: message.tool_calls[0].id, content: String(toolResult) });
                } else {
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
                }
            } else {
                console.log("\n✅ [FINAL RESPONSE] Mission complete. Final response from AI:");
                console.log(message.content);
                console.log("🏁 [AGENT FINISHED]");
                return;
            }

        } catch (error) {
            console.error(`❌ [ERROR] ${error.message}`);
            console.error("An unrecoverable error occurred. Stopping agent.");
            return;
        }
    }
    console.error("❌ Agent exceeded maximum steps. Stopping.");
}

runAgent();
