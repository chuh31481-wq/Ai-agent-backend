// index.js
// Entry point: Accepts user prompt (goal) and launches the AI Agent

const { agent } = require('./src/agent');

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter your project prompt/goal: ', async (goal) => {
    const result = await agent(goal);
    console.log("=== AGENT FINAL RESULT ===");
    console.log(result);
    rl.close();
});
