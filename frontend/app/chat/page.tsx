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
        <div className="flex flex-col h-screen bg-gradient-to-br from-neutral-50 via-blue-50/20 to-purple-50/10 dark:from-neutral-950 dark:via-blue-950/10 dark:to-purple-950/5">
            {/* Header */}
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 glass-premium dark:glass-premium-dark border-b border-white/20 dark:border-white/10 sticky top-0 z-30 backdrop-blur-xl">
                <div className="flex items-center space-x-3 sm:space-x-4">
                    <Link href="/" className="p-2 hover:bg-white/50 dark:hover:bg-neutral-800/50 rounded-full smooth-transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-base sm:text-lg hidden sm:block bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Career Tutor</h1>
                        <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-semibold">Roadmap Path</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3 sm:space-x-6">
                    <ProgressionHeader level={profile?.current_level || 1} xp={profile?.xp || 0} />

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsDashboardOpen(true)}
                        className="p-2.5 bg-white/50 dark:bg-neutral-800/50 rounded-full hover:bg-white dark:hover:bg-neutral-800 smooth-transition shadow-sm hover:shadow-md"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                    </motion.button>

                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
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
                                    className={`flex max-w-[90%] sm:max-w-[85%] space-x-3 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                                >
                                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-md ${m.role === 'user' ? 'bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-100 dark:to-neutral-200 text-white dark:text-neutral-900' : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                                        }`}>
                                        {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div
                                        className={`px-5 py-3.5 rounded-2xl shadow-sm ${m.role === 'user'
                                            ? 'bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-100 dark:to-neutral-50 text-white dark:text-neutral-900 shadow-md'
                                            : 'glass-premium dark:glass-premium-dark text-neutral-900 dark:text-white border border-white/30 dark:border-white/10'
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
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-start"
                    >
                        <div className="flex space-x-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="px-5 py-3.5 rounded-2xl glass-premium dark:glass-premium-dark border border-white/30 dark:border-white/10 shadow-sm">
                                <div className="flex space-x-1.5">
                                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <DashboardSection
                profile={profile}
                isOpen={isDashboardOpen}
                onClose={() => setIsDashboardOpen(false)}
            />

            {/* Input Area */}
            <footer className="p-4 glass-premium dark:glass-premium-dark border-t border-white/20 dark:border-white/10 backdrop-blur-xl">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type your message..."
                        className="flex-1 px-5 py-3.5 bg-white/50 dark:bg-neutral-900/50 border-2 border-transparent rounded-xl focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-900 focus-glow smooth-transition outline-none font-medium placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="p-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed smooth-transition shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
                    >
                        <Send className="w-5 h-5" />
                    </motion.button>
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
