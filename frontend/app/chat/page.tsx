'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Send, User as UserIcon, Bot, ArrowLeft, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { Message, UserProfile } from '@/types'
import { useChat } from '@ai-sdk/react'
import { ProgressionHeader } from './components/ProgressionHeader'
import { DashboardSection } from './components/DashboardSection'
import { createClient } from '@/lib/supabase/client'
import { QuizOverlay, QuizQuestion } from './components/QuizOverlay'
import { motion, AnimatePresence } from 'framer-motion'

function getTextFromMessage(m: any): string {
    if (m.content) return m.content;
    if (m.parts) {
        return m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('\n');
    }
    return '';
}

export default function ChatPage() {
    const { user, loading } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [goal, setGoal] = useState<string | null>(null)
    const [isDashboardOpen, setIsDashboardOpen] = useState(false)
    const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Fetch profile on mount
    useEffect(() => {
        if (user?.id) {
            const fetchProfile = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                setProfile(data)
            }
            fetchProfile()
        }
    }, [user?.id])

    const [input, setInput] = useState('')
    const { messages, sendMessage, status, setMessages } = useChat({
        // In AI SDK 6.x, chat options might have changed. 
        // We ensure profile updates on finish.
        onFinish: async ({ message }) => {
            const content = getTextFromMessage(message);

            if (profile) {
                const newXP = profile.xp + 10
                setProfile(prev => prev ? { ...prev, xp: newXP } : null)

                // Save XP to database
                const supabase = createClient()
                await supabase.from('profiles').update({ xp: newXP }).eq('id', user?.id)
            }

            // Persistence: Save bot message to messages table
            if (user?.id) {
                const supabase = createClient()
                await supabase.from('messages').insert({
                    user_id: user.id,
                    content: content,
                    role: 'assistant'
                })
            }

            // Check for mock quiz trigger in content
            if (content.includes('TRIGGER_QUIZ')) {
                const mockQuestions: QuizQuestion[] = [
                    {
                        id: 'q1',
                        question: "What is the primary role of a Software Engineer?",
                        options: ["Designing UI", "Writing and maintaining code", "Managing sales", "Recruiting"],
                        correctAnswer: 1,
                        explanation: "Software engineers focus on the full lifecycle of software development, primarily writing and maintaining code."
                    },
                    {
                        id: 'q2',
                        question: "Which of these is a common version control tool?",
                        options: ["React", "Git", "Node.js", "Tailwind"],
                        correctAnswer: 1,
                        explanation: "Git is the industry standard for version control, allowing developers to track changes and collaborate."
                    }
                ]
                setActiveQuiz(mockQuestions)
            }
        }
    })

    // Fetch messages on mount
    useEffect(() => {
        if (user?.id) {
            const fetchMessages = async () => {
                const supabase = createClient()
                const { data } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true })

                if (data && data.length > 0) {
                    const mappedMessages = data.map((m: any) => ({
                        id: m.id.toString(),
                        role: m.role as 'user' | 'assistant',
                        parts: [{ type: 'text' as const, text: m.content }],
                        created_at: m.created_at
                    }))
                    setMessages(mappedMessages)
                }
            }
            fetchMessages()
        }
    }, [user?.id, setMessages])

    const isTyping = status === 'streaming' || status === 'submitted'

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isTyping) return

        const currentInput = input
        setInput('')

        // Persistence: Save user message
        if (user?.id) {
            const supabase = createClient()
            await supabase.from('messages').insert({
                user_id: user.id,
                content: currentInput,
                role: 'user'
            })
        }

        await sendMessage({
            role: 'user',
            text: currentInput
        })
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Initiate conversation from landing page goal
    useEffect(() => {
        const storedGoal = sessionStorage.getItem("career_goal")
        if (storedGoal && !goal) {
            setGoal(storedGoal)
            sessionStorage.removeItem("career_goal")

            const welcomeMessage: any = {
                id: 'welcome',
                role: 'assistant',
                parts: [{ type: 'text' as const, text: `I see you want to become a **${storedGoal}**. That's an excellent choice! \n\nI'm building your personalized roadmap right now. To make it perfect, tell me: what's your current experience level with this? (e.g., complete beginner, some basic knowledge, or switching from a related field?)` }],
                created_at: new Date().toISOString()
            }
            setMessages([welcomeMessage])

            // Persistence: Save welcome message
            if (user?.id) {
                const supabase = createClient()
                supabase.from('messages').insert({
                    user_id: user.id,
                    content: welcomeMessage.parts[0].text,
                    role: 'assistant'
                }).then()
            }
        }
    }, [goal, setMessages, user?.id])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
        </div>
    )

    return (
        <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30">
                <div className="flex items-center space-x-4">
                    <Link href="/" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg hidden sm:block">Career Tutor</h1>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-tighter">Roadmap Path</p>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <ProgressionHeader level={profile?.current_level || 1} xp={profile?.xp || 0} />

                    <button
                        onClick={() => setIsDashboardOpen(true)}
                        className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 text-xs font-bold ring-2 ring-neutral-200 dark:ring-neutral-800">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                <AnimatePresence initial={false}>
                    {messages.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto"
                        >
                            <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl">
                                <Bot className="w-10 h-10 text-neutral-600 dark:text-neutral-300" />
                            </div>
                            <h2 className="text-2xl font-bold">Start your journey</h2>
                            <p className="text-neutral-600 dark:text-neutral-400">
                                Tell me more about what you want to achieve, and I'll build a personalized roadmap for you.
                            </p>
                        </motion.div>
                    ) : (
                        messages.map((m: any, idx: number) => (
                            <motion.div
                                key={m.id || idx}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`flex max-w-[85%] space-x-3 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' : 'bg-blue-600 text-white'
                                        }`}>
                                        {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div
                                        className={`px-4 py-3 rounded-2xl ${m.role === 'user'
                                            ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                                            : 'glass-dark dark:bg-neutral-900/50 text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 shadow-sm'
                                            }`}
                                    >
                                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {getTextFromMessage(m)}
                                        </div>
                                        {m.toolInvocations?.map((toolInvocation: any) => {
                                            const toolCallId = toolInvocation.toolCallId;
                                            if (toolInvocation.state === 'result') {
                                                return (
                                                    <div key={toolCallId} className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                                                        <strong>Roadmap Created:</strong> {toolInvocation.result.message}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={toolCallId} className="mt-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs animate-pulse">
                                                    Generating roadmap...
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
                {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex justify-start">
                        <div className="flex space-x-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <DashboardSection
                profile={profile}
                isOpen={isDashboardOpen}
                onClose={() => setIsDashboardOpen(false)}
            />

            {/* Input Area */}
            <footer className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-xl focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:bg-white dark:focus:bg-neutral-900 transition-all outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="p-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </footer>

            {activeQuiz && (
                <QuizOverlay
                    questions={activeQuiz}
                    onComplete={async (score) => {
                        const xpGain = score * 50
                        if (profile) {
                            const newXP = profile.xp + xpGain
                            setProfile(prev => prev ? { ...prev, xp: newXP } : null)

                            const supabase = createClient()
                            await supabase.from('profiles').update({ xp: newXP }).eq('id', user?.id)
                        }
                        setActiveQuiz(null)

                        const completionMessage: any = {
                            id: Date.now().toString(),
                            role: 'assistant',
                            parts: [{ type: 'text' as const, text: `Great job on the quiz! You've earned **${xpGain} XP**. Your understanding of these concepts is getting stronger. What would you like to focus on next?` }]
                        }
                        setMessages([...messages, completionMessage])

                        // Persistence: Save quiz result message
                        if (user?.id) {
                            const supabase = createClient()
                            await supabase.from('messages').insert({
                                user_id: user.id,
                                content: completionMessage.parts[0].text,
                                role: 'assistant'
                            })
                        }
                    }}
                    onClose={() => setActiveQuiz(null)}
                />
            )}
        </div>
    )
}
