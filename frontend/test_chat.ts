import fetch from 'node-fetch';

async function testChat() {
    console.log("Sending POST /api/chat");
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'I want to become a Javascript Developer.' },
                    { role: 'assistant', content: 'Great. Tell me your level.' },
                    { role: 'user', content: 'Complete beginner, 10 hours a week. Generate the roadmap.' }
                ],
                goal: 'Javascript Developer',
                level: 'Complete Beginner',
                userId: 'test-user-123'
            })
        });

        console.log("Response status:", response.status);
        console.log("Headers:", response.headers.raw());

        const body = response.body;
        if (!body) {
            console.log("No body returned");
            return;
        }

        body.on('data', (chunk) => {
            console.log("\n--- CHUNK ---");
            console.log(chunk.toString());
        });

        body.on('end', () => {
            console.log("\n--- STREAM ENDED ---");
        });

        body.on('error', (err) => {
            console.error("\n--- STREAM ERROR ---", err);
        });

    } catch (err) {
        console.error("Fetch failed entirely:", err);
    }
}

testChat();
