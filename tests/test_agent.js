// tests/test_agent.js
const { agent } = require('../src/agent');

async function test() {
    const res = await agent("Create a folder named test and put a file hello.txt with content 'Hello world!'");
    console.log(res);
}

test();