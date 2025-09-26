// src/agent.js
// The Core Autonomous Agent: Modular, Self-Healing, Self-Improving

const path = require('path');
const { getAllTools, ensureToolExists } = require('./tools/tool_manager');
const { getMemory, saveMemory } = require('./memory/long_term_memory');
const { execSync } = require('child_process');

async function planner(goal) {
    // A real planner would use LLM or advanced logic; here is a simple mock
    return [{ step: "analyze_goal", tool: "analyzeGoal", args: { goal } }];
}

async function selectTool(step) {
    // If the tool does not exist, auto-create it (self-improvement)
    let tool = getAllTools()[step.tool];
    if (!tool) {
        await ensureToolExists(step.tool);
        tool = getAllTools()[step.tool];
    }
    return tool;
}

async function agent(goal) {
    let memory = getMemory();
    memory.history = memory.history || [];
    memory.history.push({ type: "goal", data: goal, ts: new Date().toISOString() });

    const plan = await planner(goal);

    for (const step of plan) {
        const tool = await selectTool(step);
        if (!tool) {
            console.error(`Self-Healing Failed: Tool '${step.tool}' still not available.`);
            continue;
        }
        try {
            const result = await tool(step.args);
            memory.history.push({ type: "step", step, result, ts: new Date().toISOString() });
        } catch (e) {
            memory.history.push({ type: "error", step, error: e.message, ts: new Date().toISOString() });
            // Self-healing: Try to fix or create the tool again
            await ensureToolExists(step.tool, true);
        }
    }

    saveMemory(memory);
    return memory.history;
}

module.exports = { agent };