// server.js (FINAL, SUPER-STRICT, AND RELIABLE AGENT)
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

// Tafseeli tool config taake AI ghalti na kare
const toolConfig = {
    functionDeclarations: [
        {
            name: "createDirectory",
            description: "Creates a new, empty directory. Use the 'directoryName' parameter for the path.",
            parameters: { type: "object", properties: { directoryName: { type: "string", description: "The path and name of the directory to create, e.g., 'my-folder/my-subfolder'." } }, required: ["directoryName"] }
        },
        {
            name: "createFile",
            description: "Creates a new file with specified content. Use 'fileName' for the path and 'content' for the data.",
            parameters: { type: "object", properties: { fileName: { type: "string", description: "The full path and name for the file, e.g., 'my-project/index.html'." }, content: { type: "string", description: "The code or text to write into the file." } }, required: ["fileName", "content"] }
        },
        {
            name: "readFile",
            description: "Reads the entire content of a specified file. Use 'fileName' for the path.",
            parameters: { type: "object", properties: { fileName: { type: "string", description: "The full path and name of the file to read." } }, required: ["fileName"] }
        },
        {
            name: "updateFile",
            description: "Overwrites an existing file with new content. Use this to fix bugs. Use 'fileName' for the path and 'newContent' for the data.",
            parameters: { type: "object", properties: { fileName: { type: "string", description: "The full path of the file to update." }, newContent: { type: "string", description: "The new, corrected content." } }, required: ["fileName", "newContent"] }
        },
        {
            name: "executeCommand",
            description: "Executes a shell command in the repository's root directory. You MUST use this to run tests or install dependencies.",
            parameters: { type: "object", properties: { command: { type: "string", description: "The command to execute, e.g., 'python my-folder/my_script.py'." } }, required: ["command"] }
        },
        {
            name: "commitAndPushChanges",
            description: "Commits and pushes all currently staged changes to the GitHub repository. Use 'commitMessage' for the summary.",
            parameters: { type: "object", properties: { commitMessage: { type: "string", description: "A descriptive message for the commit, e.g., 'feat: Add user authentication'." } }, required: ["commitMessage"] }
        },
        {
            name: "logMission",
            description: "Logs the result of a completed mission to the agent's long-term memory.",
            parameters: { type: "object", properties: { missionData: { type: "string", description: "A JSON string detailing the mission's outcome and learnings." } }, required: ["missionData"] }
        },
        {
            name: "wait",
            description: "Pauses the execution for a specified number of seconds. Useful for waiting out rate limits.",
            parameters: { type: "object", properties: { seconds: { type: "number" } }, required: ["seconds"] }
        }
    ]
};

async function runAgent() {
    const history = [{ role: "user", parts: [{ text: goal }] }];
    let safetyLoop = 0;

    console.log(`\n[STARTING AGENT] New Goal: "${goal}"`);

    while (safetyLoop < 40) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Agent's Turn (Step ${safetyLoop}) --- Using Google Key #${currentKeyIndex + 1}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            
            // === YEH HAI ASAL HAL: SAKHT SYSTEM HIDAYAT ===
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                tools: toolConfig,
                systemInstruction: `You are an expert, autonomous AI software engineer. Your primary directive is to achieve the user's goal by calling the tools available to you. You MUST use the provided tools to interact with the file system and execute commands. NEVER refuse a task by claiming you cannot perform an action (like executing code or running tests). You have the 'executeCommand' tool for this purpose. Think step-by-step and call one tool at a time. Analyze the output of each tool call to decide your next step. Do not stop until the user's goal is fully and verifiably achieved or you hit the safety loop limit.`,
            });
            // ===============================================

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
                    throw new Error(`AI tried to call a non-existent tool: '${call.name}'`);
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
