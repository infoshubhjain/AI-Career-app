import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { generateAndSaveRoadmap } from '@/lib/ai/roadmap-service';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export const maxDuration = 120;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Handle both our custom format and AI SDK format
        let messages = body.messages;
        let goal = body.goal;
        let level = body.level;
        let userId = body.userId; // Use provided user ID

        // If this is from AI SDK useChat, extract the needed info
        if (!goal && messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.content) {
                const content = typeof lastMessage.content === 'string' 
                    ? lastMessage.content 
                    : lastMessage.content.map((p: any) => p.text).join(' ');
                
                // Extract goal from the first user message
                const firstUserMessage = messages.find((m: any) => m.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                    const firstContent = typeof firstUserMessage.content === 'string' 
                        ? firstUserMessage.content 
                        : firstUserMessage.content.map((p: any) => p.text).join(' ');
                    
                    // Simple goal extraction
                    if (firstContent.toLowerCase().includes('web developer')) goal = 'web developer';
                    else if (firstContent.toLowerCase().includes('developer')) goal = 'developer';
                    else goal = 'career development';
                }
                
                level = 'beginner'; // Default level
                // Don't override userId if we have an authenticated user
                if (!userId) userId = 'anonymous';
            }
        }

        // Validate messages parameter
        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Ensure messages are in the correct format for AI SDK
        const formattedMessages = messages.map((msg: any) => {
            if (typeof msg.content === 'string') {
                return msg;
            } else if (Array.isArray(msg.content)) {
                // Handle array content (from useChat)
                return {
                    ...msg,
                    content: msg.content.map((part: any) => 
                        typeof part === 'string' ? part : part.text || ''
                    ).join('')
                };
            } else if (msg.parts && Array.isArray(msg.parts)) {
                // Handle parts format (from useChat)
                const textContent = msg.parts
                    .filter((part: any) => part.type === 'text')
                    .map((part: any) => part.text)
                    .join('');
                return {
                    ...msg,
                    content: textContent
                };
            }
            return msg;
        });

        // Check for Mock Mode
        const isMockMode = process.env.NEXT_PUBLIC_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('placeholder') || process.env.OPENAI_API_KEY.includes('temp_key');

        if (isMockMode) {
            const lastMsgObj = messages[messages.length - 1];
            let lastMessage = '';

            if (typeof lastMsgObj.content === 'string') {
                lastMessage = lastMsgObj.content.toLowerCase();
            } else if (Array.isArray(lastMsgObj.content)) {
                lastMessage = lastMsgObj.content.map((p: any) => p.text).join(' ').toLowerCase();
            }

            let responseText = '';
            if (lastMessage.includes('roadmap') || lastMessage.includes('plan')) {
                // Generate mock roadmap
                setTimeout(async () => {
                    try {
                        await generateAndSaveRoadmap(userId || 'anonymous', goal || 'career development', level || 'beginner');
                    } catch (error) {
                        console.error('Mock roadmap generation failed:', error);
                    }
                }, 1000);
                
                responseText = `I've started creating your personalized roadmap for becoming a ${goal || 'professional'}! Since it's extremely comprehensive (100+ steps), it will take about a minute to architect in the background. You can check your Dashboard to view it once it's ready.`;
            } else if (lastMessage.includes('quiz')) {
                responseText = `Here's a quick quiz to test your knowledge:\n\n1. What's the difference between let and const in JavaScript?\n2. What is a REST API?\n3. Explain the concept of responsive design.\n\nWould you like me to provide the answers?`;
            } else {
                responseText = `That's a great question about becoming a ${goal || 'developer'}! I recommend starting with the fundamentals like HTML, CSS, and JavaScript. Would you like me to create a personalized roadmap for your learning journey?`;
            }

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(`data: {"type":"text-delta","delta":"${responseText}"}\n\n`));
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
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

        const systemPrompt = `You are an AI career coach and mentor. You help users achieve their career goals by providing guidance, generating roadmaps, and creating quizzes to test their knowledge. Be encouraging, practical, and provide actionable advice. When users ask about career goals, use the generateRoadmap tool to create personalized learning paths. When users want to test their knowledge, use the generateQuiz tool.`;

        const result = await streamText({
            model: openai('gpt-3.5-turbo'),
            system: systemPrompt,
            messages: formattedMessages,
            tools: {
                generateRoadmap: {
                    description: 'Generate a career roadmap for the user based on their goal and level.',
                    inputSchema: z.object({
                        goal: z.string().describe('The career goal of the user.'),
                        level: z.string().describe('The current experience level of the user.'),
                        context: z.string().optional().describe('Any additionally gathered context like specific niche, location, time commitment, or constraints.')
                    }),
                    execute: async ({ goal, level, context }: { goal: string, level: string, context?: string }) => {
                        console.log('Roadmap generation requested:', { userId, goal, level, context });
                        
                        // Ensure we have a valid userId
                        if (!userId || userId === 'anonymous') {
                            return {
                                roadmap_id: "error",
                                message: `I need you to be logged in to generate your personalized roadmap for becoming a ${goal}. Please sign up or login first, then ask me again!`,
                                preview: null
                            };
                        }

                        // Fire and forget using Node setTimeout to break Next.js async tracking
                        setTimeout(async () => {
                            try {
                                console.log('Starting background roadmap generation for user:', userId);
                                await generateAndSaveRoadmap(userId, goal, level, context);
                                console.log('Roadmap generation completed for user:', userId);
                            } catch (err) {
                                console.error("Background roadmap generation failed:", err);
                                // Log the error for debugging
                                const logPath = path.join(process.cwd(), 'debug-roadmap-error.log');
                                fs.appendFileSync(logPath, `\n\n--- ROADMAP ERROR ${new Date().toISOString()} ---\nUser: ${userId}\nGoal: ${goal}\nLevel: ${level}\nError: ${String(err)}\n${err instanceof Error ? err.stack : ''}\n`);
                            }
                        }, 100).unref();

                        return {
                            roadmap_id: "pending",
                            message: `I've started creating your highly detailed roadmap for becoming a ${goal}! Since it's extremely comprehensive (100+ steps), it will take about a minute to architect in the background. You can check your Dashboard to view it once it's ready.`,
                            preview: {
                                total_steps: 100,
                                next_milestone: "Foundation Building"
                            }
                        };
                    },
                },
                generateQuiz: {
                    description: 'Generate a short interactive quiz to test the user\'s knowledge on a specific topic. Use this tool when the user has learned something and needs to be tested, or when they explicitly ask for a quiz.',
                    inputSchema: z.object({
                        topic: z.string().describe('The topic to generate quiz questions about (e.g., "JavaScript fundamentals", "Git version control").'),
                        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('The difficulty level: beginner, intermediate, or advanced.'),
                        numQuestions: z.number().optional().describe('Number of questions to generate (3-5).')
                    }),
                    execute: async ({ topic, difficulty, numQuestions }: { topic: string, difficulty: string, numQuestions?: number }) => {
                        const count = Math.min(Math.max(numQuestions || 3, 2), 5);
                        // Use the AI provider to generate quiz questions
                        const { generateText } = await import('ai');
                        const quizResult = await generateText({
                            model: openai('gpt-3.5-turbo'),
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
                            
                            // Additional cleanup for common issues
                            quizText = quizText.replace(/,\s*]/g, ']'); // Remove trailing commas
                            quizText = quizText.replace(/,\s*}/g, '}'); // Remove trailing commas in objects
                            
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
                                type: 'quiz',
                                topic,
                                difficulty,
                                questions: [
                                    {
                                        id: "q1",
                                        question: `What is the main purpose of ${topic}?`,
                                        options: ["Option A", "Option B", "Option C", "Option D"],
                                        correctAnswer: 0,
                                        explanation: "This is a fallback question due to a parsing error."
                                    }
                                ],
                                message: `Here's a ${difficulty} quiz on "${topic}" with 1 question!`
                            };
                        }
                    },
                },
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Chat API Error:', error);
        try {
            const logPath = path.join(process.cwd(), 'debug-chat-error.log');
            fs.appendFileSync(logPath, `\n\n--- ERROR AT ${new Date().toISOString()} ---\n${String(error)}\n${error instanceof Error ? error.stack : ''}\n`);
        } catch (e) {
            console.error('Failed to write log', e);
        }
        return new Response(JSON.stringify({ error: 'Failed to process chat' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
