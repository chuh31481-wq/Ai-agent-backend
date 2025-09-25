// server.js - ENHANCED VERSION FOR LARGE PROJECTS
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools.js');

const goal = process.env.AGENT_GOAL;

// Enhanced Multi-Key Logic with Better Management
const apiKeys = [];
for (let i = 1; i <= 10; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`]) {
        apiKeys.push(process.env[`GEMINI_API_KEY_${i}`]);
    }
}
if (apiKeys.length === 0) {
    console.error("FATAL: No GEMINI_API_KEY_n secrets found.");
    process.exit(1);
}

let currentKeyIndex = 0;
let projectContext = {
    currentStep: 0,
    completedTasks: [],
    projectStructure: {},
    dependencies: [],
    errors: []
};

// Enhanced Tool Configuration for Large Projects
const toolConfig = {
    functionDeclarations: [
        {
            name: "analyzeProjectRequirements",
            description: "Analyze project requirements and create a development plan",
            parameters: { 
                type: "object", 
                properties: { 
                    requirements: { type: "string" },
                    technologyStack: { type: "string" },
                    deliverables: { type: "string" }
                }, 
                required: ["requirements"] 
            }
        },
        {
            name: "createProjectStructure",
            description: "Create complete project structure with folders and base files",
            parameters: { 
                type: "object", 
                properties: { 
                    structure: { type: "string", description: "JSON string describing project structure" } 
                }, 
                required: ["structure"] 
            }
        },
        {
            name: "createFileWithTemplate",
            description: "Create file using appropriate template based on file type",
            parameters: { 
                type: "object", 
                properties: { 
                    fileName: { type: "string" },
                    templateType: { type: "string", description: "e.g., react-component, express-server, python-class" },
                    customContent: { type: "string" }
                }, 
                required: ["fileName", "templateType"] 
            }
        },
        {
            name: "installDependencies",
            description: "Install project dependencies using appropriate package manager",
            parameters: { 
                type: "object", 
                properties: { 
                    packageManager: { type: "string", enum: ["npm", "yarn", "pip", "pip3", "maven", "gradle"] },
                    dependencies: { type: "string", description: "Space separated list of packages" }
                }, 
                required: ["packageManager"] 
            }
        },
        {
            name: "runTestsAndValidate",
            description: "Run tests and validate the project works correctly",
            parameters: { 
                type: "object", 
                properties: { 
                    testCommand: { type: "string" },
                    validationCriteria: { type: "string" }
                } 
            }
        },
        {
            name: "createDocumentation",
            description: "Create project documentation including README and setup instructions",
            parameters: { 
                type: "object", 
                properties: { 
                    docType: { type: "string", enum: ["readme", "api", "setup", "deployment"] },
                    content: { type: "string" }
                }, 
                required: ["docType"] 
            }
        },
        // Existing tools (keep all from previous version)
        ...require('./tools.js').toolConfig?.functionDeclarations || []
    ]
};

async function runAgent() {
    const history = [{ 
        role: "user", 
        parts: [{ 
            text: `CRITICAL MISSION: Create a complete, production-ready project based on these requirements: ${goal}
            
            You are an EXPERT FULL-STACK DEVELOPER with 10+ years experience. You MUST:
            1. First analyze requirements and create a development plan
            2. Set up proper project structure
            3. Implement core functionality
            4. Add tests and validation
            5. Create comprehensive documentation
            6. Ensure everything works perfectly
            
            Current project context: ${JSON.stringify(projectContext)}
            Available technologies: React, Node.js, Python, Express, MongoDB, PostgreSQL, etc.
            Deliver COMPLETE, WORKING solution in one go.` 
        }] 
    }];
    
    let safetyLoop = 0;
    const MAX_STEPS = 100; // Increased for large projects

    console.log(`\n🚀 [STARTING ENHANCED AGENT] Project: "${goal}"`);

    while (safetyLoop < MAX_STEPS) {
        safetyLoop++;
        try {
            const apiKey = apiKeys[currentKeyIndex];
            console.log(`\n--- Step ${safetyLoop}/${MAX_STEPS} --- Using Key #${currentKeyIndex + 1}`);
            
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro", // More powerful model for complex projects
                tools: toolConfig,
                systemInstruction: `You are a SENIOR FULL-STACK DEVELOPER creating production-ready applications. 
                Your expertise: React, Node.js, Python, Express, MongoDB, PostgreSQL, Docker, AWS.
                Your process: Analysis → Planning → Implementation → Testing → Documentation.
                CRITICAL: Always think step-by-step. Create COMPLETE projects. Handle errors gracefully.
                NEVER leave tasks half-finished. Deliver WORKING solutions.`,
            });

            const result = await model.generateContent({ contents: history });
            const response = result.response;
            if (!response) throw new Error("No response from model");

            const call = response.functionCalls()?.[0];

            if (call) {
                console.log(`\n🔧 [ACTION] ${call.name}`, call.args);
                history.push({ role: "model", parts: [{ functionCall: call }] });

                if (tools[call.name]) {
                    const toolResult = await tools[call.name](call.args);
                    console.log(`📊 [RESULT] ${String(toolResult).substring(0, 500)}...`);
                    
                    // Update project context
                    projectContext.currentStep = safetyLoop;
                    projectContext.completedTasks.push(call.name);
                    
                    history.push({ 
                        role: "function", 
                        parts: [{ 
                            functionResponse: { 
                                name: call.name, 
                                response: { 
                                    content: String(toolResult),
                                    projectContext: projectContext 
                                } 
                            } 
                        }] 
                    });
                } else {
                    throw new Error(`Tool not found: ${call.name}`);
                }
            } else {
                console.log("\n✅ [MISSION ACCOMPLISHED] Project completed successfully!");
                console.log("Final AI Summary:", response.text());
                console.log("📈 Project Statistics:", JSON.stringify(projectContext, null, 2));
                return;
            }

        } catch (error) {
            console.error(`❌ [ERROR] ${error.message}`);
            
            if (error.message.includes("429") || error.message.includes("quota")) {
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                console.log(`🔄 Switching to API Key #${currentKeyIndex + 1}`);
                await tools.wait({ seconds: 30 });
                continue;
            }
            
            // For other errors, try to recover
            projectContext.errors.push(error.message);
            console.log("🛠️ Attempting to recover and continue...");
            await tools.wait({ seconds: 10 });
        }
    }
    
    console.error("❌ Maximum steps reached. Project may be incomplete.");
}

runAgent();
