import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        
        const result = await streamText({
            model: openai('gpt-3.5-turbo'),
            messages: messages,
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Test API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process test' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
