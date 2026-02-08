'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Send, User as UserIcon, Bot, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Message } from '@/types'

export default function ChatPage() {
    const { user, loading } = useAuth()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Initiate conversation from landing page goal
    useEffect(() => {
        const storedGoal = sessionStorage.getItem("career_goal")
        if (storedGoal && messages.length === 0) {
            sessionStorage.removeItem("career_goal") // Clear it so it doesn't re-trigger

            const welcomeMessage: Message = {
                id: 'welcome',
                role: 'assistant',
                content: `I see you want to become a **${storedGoal}**. That's an excellent choice! \n\nI'm building your personalized roadmap right now. To make it perfect, tell me: what's your current experience level with this? (e.g., complete beginner, some basic knowledge, or switching from a related field?)`,
                created_at: new Date().toISOString()
            }
            setMessages([welcomeMessage])
        }
    }, [messages.length])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isTyping) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsTyping(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    // Current goal from session or state would go here
                })
            })

            if (!response.ok) throw new Error('Failed to fetch AI response')

            const data = await response.json()

            const aiMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.content,
                created_at: new Date().toISOString(),
                metadata: data.roadmap_preview
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Chat Error:', error)
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again in a moment.",
                created_at: new Date().toISOString()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsTyping(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
        </div>
    )

    return (
        <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center space-x-4">
                    <Link href="/" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-xl">Career Tutor Chat</h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Personalized Roadmap Path</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 text-xs font-bold">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                        <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl">
                            <Bot className="w-10 h-10 text-neutral-600 dark:text-neutral-300" />
                        </div>
                        <h2 className="text-2xl font-bold">Start your journey</h2>
                        <p className="text-neutral-600 dark:text-neutral-400">
                            Tell me more about what you want to achieve, and I'll build a personalizedroadmap for you.
                        </p>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`flex max-w-[80%] space-x-3 ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' : 'bg-neutral-200 dark:bg-neutral-800'
                                    }`}>
                                    {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div
                                    className={`px-4 py-3 rounded-2xl ${m.role === 'user'
                                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                                        : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm'
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isTyping && (
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

            {/* Input Area */}
            <footer className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
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
        </div>
    )
}
