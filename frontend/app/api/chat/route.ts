import { streamText, jsonSchema, convertToModelMessages } from 'ai';
import { aiProvider } from '@/lib/ai/ai-client';
import { systemPrompt } from '@/lib/ai/prompts';
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
        let userId = body.userId;

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
                userId = 'anonymous'; // Default user
            }
        }

        // Validate messages parameter
        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages array is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check for Mock Mode
        const isMockMode = process.env.NEXT_PUBLIC_MOCK_AI === 'true' || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('placeholder') || process.env.OPENAI_API_KEY.includes('temp_key');

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

            // Enhanced mock responses based on user input
            if (lastMessage.includes('web developer') || lastMessage.includes('developer')) {
                content = "Great choice! Web development is an excellent career path. To create your personalized roadmap, I need to know: what's your current experience level?\n\n[OPTIONS: Complete Beginner | Some Basic Knowledge | Switching from Related Field]";
            } else if (lastMessage.includes('beginner') || lastMessage.includes('complete beginner')) {
                content = "Perfect! I'll create a comprehensive roadmap for a complete beginner. Web development starts with HTML, CSS, and JavaScript fundamentals.\n\nLet me generate your personalized 100-step roadmap now. This will include everything from basic syntax to advanced frameworks and deployment.\n\n**Generating your roadmap...** (This would normally call the AI to create a detailed learning path)";
            } else if (lastMessage.includes('quiz') || lastMessage.includes('test')) {
                content = "Great idea! Let me test your knowledge with a quick quiz.\n\n**Quiz: HTML Basics**\n1. What does HTML stand for?\n2. Which tag is used for the largest heading?\n3. How do you create a link in HTML?\n\n[OPTIONS: I know this! | Need to study first | Skip quiz]";
            } else if (lastMessage.includes('roadmap') || lastMessage.includes('plan')) {
                content = "Your roadmap is ready! Here's a preview:\n\n**Phase 1: Foundations (Steps 1-15)**\n- HTML5 semantics and structure\n- CSS3 fundamentals and responsive design\n- JavaScript basics and DOM manipulation\n\n**Phase 2: Frontend Frameworks (Steps 16-35)**\n- React or Vue.js fundamentals\n- Component-based architecture\n- State management\n\n**Phase 3: Backend Development (Steps 36-55)**\n- Node.js and Express\n- Database design with SQL/NoSQL\n- API development\n\nWould you like me to elaborate on any specific phase?\n\n[OPTIONS: Tell me more about Phase 1 | Focus on React | Database basics]";
            }

            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                    const chunks = content.split(' ');
                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
                        await new Promise(r => setTimeout(r, 30));
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

        const result = await streamText({
            model: aiProvider,
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
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
                        // Fire and forget using Node setTimeout to break Next.js async tracking
                        setTimeout(() => {
                            generateAndSaveRoadmap(userId, goal, level, context).catch((err) => {
                                console.error("Background roadmap generation failed:", err);
                            });
                        }, 100).unref();

                        return {
                            roadmap_id: "pending",
                            message: `I've started creating your highly detailed roadmap for becoming a ${goal}! Since it's extremely comprehensive (100+ steps), it will take about a minute to architect in the background. You can check your Dashboard to view it once it's ready.`,
                            preview: null // Omit preview since it's not generated yet
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
