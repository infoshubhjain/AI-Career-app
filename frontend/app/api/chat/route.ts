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
                            context: {
                                type: 'string',
                                description: 'Any additionally gathered context like specific niche, location, time commitment, or constraints.'
                            }
                        },
                        required: ['goal', 'level'],
                    }),
                    execute: async ({ goal, level, context }: { goal: string, level: string, context?: string }) => {
                        const roadmap = await generateAndSaveRoadmap(userId, goal, level, context);
                        return {
                            roadmap_id: roadmap.id,
                            message: `I've successfully created your highly detailed roadmap for becoming a ${goal}!`,
                            preview: {
                                current_step: 1,
                                total_steps: roadmap.full_roadmap.total_steps,
                                next_milestone: roadmap.full_roadmap.phases[0].title
                            }
                        };
                    },
                },
                generateQuiz: {
                    description: 'Generate a short interactive quiz to test the user\'s knowledge on a specific topic. Use this tool when the user has learned something and needs to be tested, or when they explicitly ask for a quiz.',
                    inputSchema: jsonSchema({
                        type: 'object',
                        properties: {
                            topic: {
                                type: 'string',
                                description: 'The topic to generate quiz questions about (e.g., "JavaScript fundamentals", "Git version control").'
                            },
                            difficulty: {
                                type: 'string',
                                description: 'The difficulty level: beginner, intermediate, or advanced.',
                                enum: ['beginner', 'intermediate', 'advanced']
                            },
                            numQuestions: {
                                type: 'number',
                                description: 'Number of questions to generate (3-5).'
                            },
                        },
                        required: ['topic', 'difficulty'],
                    }),
                    execute: async ({ topic, difficulty, numQuestions }: { topic: string, difficulty: string, numQuestions?: number }) => {
                        const count = Math.min(Math.max(numQuestions || 3, 2), 5);
                        // Use the AI provider to generate quiz questions
                        const { generateText } = await import('ai');
                        const quizResult = await generateText({
                            model: aiProvider,
                            prompt: `Generate exactly ${count} multiple-choice quiz questions about "${topic}" at a ${difficulty} difficulty level.

Return ONLY a valid JSON array. Each question object must have:
- "id": a unique string like "q1", "q2", etc.
- "question": the question text
- "options": array of exactly 4 answer strings
- "correctAnswer": the 0-based index of the correct option
- "explanation": a brief explanation of why the correct answer is right

Example format:
[{"id":"q1","question":"What is...?","options":["A","B","C","D"],"correctAnswer":0,"explanation":"Because..."}]

Return ONLY the JSON array, no markdown, no code blocks, no extra text.`,
                        });

                        try {
                            // Parse the generated quiz
                            let quizText = quizResult.text.trim();
                            // Strip markdown code blocks if present
                            if (quizText.startsWith('```')) {
                                quizText = quizText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                            }
                            const questions = JSON.parse(quizText);
                            return {
                                type: 'quiz',
                                topic,
                                difficulty,
                                questions,
                                message: `Here's a ${difficulty} quiz on "${topic}" with ${questions.length} questions!`
                            };
                        } catch (parseError) {
                            console.error('Failed to parse quiz JSON:', parseError);
                            return {
                                type: 'quiz_error',
                                message: 'I had trouble generating the quiz. Let me try explaining the topic instead.'
                            };
                        }
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
