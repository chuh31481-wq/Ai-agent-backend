// backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const tools = require('./tools.js');

const app = express();

// === YEH HAI AHEM TABDEELI ===
// Hum server ko bata rahe hain ke sirf is URL se aane wali requests ko allow karna hai.
const corsOptions = {
  origin: 'https://ai-agent-frontend.vercel.app', // <-- Yahan apna frontend ka URL likhein
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
// =============================

app.use(express.json());

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("Error: GOOGLE_API_KEY .env file mein nahi mili.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: {
        functionDeclarations: [
            {
                name: "createDirectory",
                description: "Local workspace mein ek naya, khali folder (directory) banata hai.",
                parameters: {
                    type: "object",
                    properties: {
                        directoryName: { type: "string", description: "Banaye jaane wale folder ka naam." }
                    },
                    required: ["directoryName"]
                }
            },
            {
                name: "createFile",
                description: "Ek file banata hai aur usmein diya gaya content likhta hai. File path workspace ke hisab se relative hona chahiye.",
                parameters: {
                    type: "object",
                    properties: {
                        fileName: { type: "string", description: "File ka naam aur path, jaise 'folder/file.txt'." },
                        content: { type: "string", description: "File ke andar likha jaane wala text." }
                    },
                    required: ["fileName", "content"]
                }
            },
            {
                name: "readFile",
                description: "Workspace mein maujood ek file ke content ko parhta hai.",
                parameters: {
                    type: "object",
                    properties: {
                        fileName: { type: "string" }
                    },
                    required: ["fileName"]
                }
            },
            {
                name: "updateFile",
                description: "Workspace mein maujood ek file ke content ko naye content se badal deta hai.",
                parameters: {
                    type: "object",
                    properties: {
                        fileName: { type: "string" },
                        newContent: { type: "string" }
                    },
                    required: ["fileName", "newContent"]
                }
            },
            {
                name: "executeCommand",
                description: "Operating system ke terminal par ek command chalata hai. 'directory' parameter ka istemal karke command ko kisi khaas sub-folder mein chalaya ja sakta hai.",
                parameters: {
                    type: "object",
                    properties: {
                        command: { type: "string", description: "Chalai jaane wali command." },
                        directory: { type: "string", description: "Command ko chalane ke liye sub-directory ka naam." }
                    },
                    required: ["command"]
                }
            },
            {
                name: "createGithubRepo",
                description: "User ke GitHub account par ek nayi public repository banata hai.",
                parameters: {
                    type: "object",
                    properties: {
                        repoName: { type: "string", description: "Banayi jaane wali repository ka naam." }
                    },
                    required: ["repoName"]
                }
            }
        ]
    }
});

// GET route to check if server is alive
app.get('/', (req, res) => {
    res.send('AI Agent Backend is running!');
});

app.post('/run-agent', async (req, res) => {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: 'Goal zaroori hai.' });

    console.log(`\n[NEW GOAL] "${goal}"`);

    try {
        const history = [{ role: "user", parts: [{ text: goal }] }];
        while (true) {
            const result = await model.generateContent({ contents: history });
            const response = result.response;
            const call = response.functionCalls()?.[0];

            if (!call) {
                console.log("[AI RESPONSE] Final jawab de raha hoon.");
                res.json({ response: response.text() });
                return;
            }

            console.log(`[AI DECISION] Tool call karne ka faisla kiya: ${call.name}`);
            console.log(`[AI ARGUMENTS]`, call.args);
            history.push({ role: "model", parts: [{ functionCall: call }] });

            if (tools[call.name]) {
                const toolResult = await tools[call.name](call.args);
                console.log(`[TOOL RESULT] (first 100 chars): "${String(toolResult).substring(0, 100)}..."`);
                history.push({
                    role: "function",
                    parts: [{ functionResponse: { name: call.name, response: { content: toolResult } } }]
                });
            } else {
                console.error(`[ERROR] AI ne ek na-maujood tool '${call.name}' call karne ki koshish ki.`);
                history.push({
                    role: "function",
                    parts: [{ functionResponse: { name: call.name, response: { content: `Error: Tool ${call.name} not found.` } } }]
                });
            }
        }
    } catch (error) {
        console.error("[FATAL ERROR] Agent ko chalate waqt error:", error);
        res.status(500).json({ error: 'Agent ko chalate waqt error aayi. Backend terminal check karein.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server http://localhost:${PORT} par chal raha hai`);
});

// Export the app for Vercel
module.exports = app;
