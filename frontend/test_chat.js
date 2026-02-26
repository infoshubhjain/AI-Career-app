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

        const body = response.body;
        if (!body) {
            console.log("No body returned");
            return;
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log("\n--- STREAM ENDED ---");
                break;
            }
            console.log("\n--- CHUNK ---");
            console.log(decoder.decode(value));
        }
    } catch (err) {
        console.error("Fetch failed entirely:", err);
    }
}

testChat();
