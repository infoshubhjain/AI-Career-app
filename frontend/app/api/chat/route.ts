import { streamText, jsonSchema, convertToModelMessages } from 'ai';
import { aiProvider } from '@/lib/ai/ai-client';
import { systemPrompt } from '@/lib/ai/prompts';
import { generateAndSaveRoadmap } from '@/lib/ai/roadmap-service';
import { z } from 'zod';

export const maxDuration = 120;

export async function POST(req: Request) {
    try {
        const { messages, goal, level, userId } = await req.json();

        // Check for Mock Mode
        const isMockMode = process.env.NEXT_PUBLIC_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY;

        if (isMockMode) {
            const lastMsgObj = messages[messages.length - 1];
            let lastMessage = '';

            if (typeof lastMsgObj.content === 'string') {
                lastMessage = lastMsgObj.content.toLowerCase();
            } else if (Array.isArray(lastMsgObj.content)) {
                lastMessage = lastMsgObj.content
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join(' ')
                    .toLowerCase();
            }

            let content = "I'm currently in **Mock Mode** because no API key was found. Even so, I can help you test the leveling system!\n\nTo move forward, tell me more about your specific interests in this field.";

            if (lastMessage.includes('quiz')) {
                content = "Sure! Let's test your knowledge. Get ready...\n\nTRIGGER_QUIZ";
            } else if (lastMessage.includes('roadmap')) {
                content = "I've already started building your roadmap. You're currently at Step 1: Foundation. What's your current experience level?";
            } else if (lastMessage.includes('beginner')) {
                content = "Great! I am generating a tailored roadmap for a complete beginner. Let's do this!";
            }

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    const chunks = content.split(' ');
                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
                        await new Promise(r => setTimeout(r, 40));
                    }
                    controller.close();
                }
            });

            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'x-vercel-ai-data-stream': 'v1'
                }
            });
        }

        const normalizedMessages = messages.map((m: any) => ({
            ...m,
            parts: m.parts || [{ type: 'text', text: m.content || '' }]
        }));

        const result = await streamText({
            model: aiProvider,
            system: systemPrompt,
            messages: await convertToModelMessages(normalizedMessages),
            tools: {
                generateRoadmap: {
                    description: 'Generate a career roadmap for the user based on their goal and level.',
                    // We use jsonSchema explicitly to bypass the AI SDK's internal Zod conversion
                    // which is currently causing "type: None" errors on some deployments.
                    inputSchema: jsonSchema({
                        type: 'object',
                        properties: {
                            goal: {
                                type: 'string',
                                description: 'The career goal of the user.'
                            },
                            level: {
                                type: 'string',
                                description: 'The current experience level of the user.'
                            },
                        },
                        required: ['goal', 'level'],
                    }),
                    execute: async ({ goal, level }: { goal: string, level: string }) => {
                        const roadmap = await generateAndSaveRoadmap(userId, goal, level);
                        return {
                            roadmap_id: roadmap.id,
                            message: `I've successfully created your roadmap for becoming a ${goal}!`,
                            preview: {
                                current_step: 1,
                                total_steps: roadmap.full_roadmap.total_steps,
                                next_milestone: roadmap.full_roadmap.phases[0].title
                            }
                        };
                    },
                },
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process chat' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
