import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function main() {
    try {
        const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            prompt: 'Write a vegetarian lasagna recipe for 4 people.',
        });
        console.log("Success! Response from OpenAI:");
        console.log(text);
    } catch (error) {
        console.error("SDK Error:", error);
    }
}

main();
