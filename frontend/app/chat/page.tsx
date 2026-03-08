'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Bot, LayoutDashboard, Radar, Send, Target, User as UserIcon } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { createAgentSession, sendAgentMessage } from '@/app/lib/agent-api'
import { DashboardSection } from './components/DashboardSection'
import { ProgressionHeader } from './components/ProgressionHeader'
import { AgentRoadmapDomain, AgentRoadmapSkill, AgentSessionResponse, UserProfile } from '@/types'

type TimelineMessage = {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt: string
}

const STORAGE_KEYS = {
    session: 'agent_session_snapshot',
    messages: 'agent_transcript_snapshot',
}

function logPipeline(event: string, payload?: unknown) {
    console.groupCollapsed(`[agent-chat] ${event}`)
    if (payload !== undefined) console.log(payload)
    console.groupEnd()
}

function getCurrentDomain(session: AgentSessionResponse | null): AgentRoadmapDomain | null {
    const domains = session?.roadmap?.domains || []
    const domainIndex = session?.state?.roadmap_progress?.domain_index ?? 0
    return domains[domainIndex] || null
}

function getCurrentSkill(session: AgentSessionResponse | null): AgentRoadmapSkill | null {
    const domain = getCurrentDomain(session)
    const skillIndex = session?.state?.roadmap_progress?.skill_index ?? 0
    return domain?.subdomains?.[skillIndex] || null
}

function getCurrentTopic(session: AgentSessionResponse | null): Record<string, unknown> | null {
    const lessonPlan = session?.state?.lesson_plan || []
    const topicIndex = session?.state?.current_topic_index ?? 0
    return lessonPlan[topicIndex] || null
}

function buildAssistantMessage(response: AgentSessionResponse): TimelineMessage {
    return {
        id: `${response.session_id}-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        createdAt: new Date().toISOString(),
    }
}

function statusTone(status: string) {
    if (status.includes('quiz')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-400/30'
    if (status.includes('knowledge')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-400/30'
    if (status.includes('teach')) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-400/30'
    if (status.includes('profile')) return 'bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-400/30'
    if (status === 'completed') return 'bg-purple-500/15 text-purple-700 dark:text-purple-200 border-purple-400/30'
    return 'bg-white/50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-200 border-white/20 dark:border-white/10'
}

function inputPlaceholder(session: AgentSessionResponse | null) {
    if (!session) return 'Describe the career path you want to pursue...'
    if (session.status === 'awaiting_profile') return 'Answer the onboarding questions...'
    if (session.status === 'awaiting_knowledge_answer') return 'Answer the technical checkpoint question...'
    if (session.status === 'awaiting_topic_followup') return "Ask a follow-up question or type 'ready'..."
    if (session.status.includes('quiz')) return 'Answer the quiz prompt...'
    return 'Type your message...'
}

export default function ChatPage() {
    const { user, loading } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [session, setSession] = useState<AgentSessionResponse | null>(null)
    const [messages, setMessages] = useState<TimelineMessage[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDashboardOpen, setIsDashboardOpen] = useState(false)
    const [hasBootstrappedGoal, setHasBootstrappedGoal] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const rawSession = sessionStorage.getItem(STORAGE_KEYS.session)
        const rawMessages = sessionStorage.getItem(STORAGE_KEYS.messages)
        if (rawSession) {
            try {
                const parsed = JSON.parse(rawSession) as AgentSessionResponse
                setSession(parsed)
                logPipeline('session_snapshot_restored', parsed)
            } catch (restoreError) {
                console.error('Failed to restore session snapshot', restoreError)
            }
        }
        if (rawMessages) {
            try {
                const parsed = JSON.parse(rawMessages) as TimelineMessage[]
                setMessages(parsed)
            } catch (restoreError) {
                console.error('Failed to restore transcript snapshot', restoreError)
            }
        }
    }, [])

    useEffect(() => {
        if (!session) return
        sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
    }, [session])

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages))
    }, [messages])

    useEffect(() => {
        if (user?.id) {
            const fetchProfile = async () => {
                const supabase = createClient()
                if (!supabase) return
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                setProfile(data)
            }
            fetchProfile()
        }
    }, [user?.id])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (!user?.id || hasBootstrappedGoal || session) return
        const storedGoal = sessionStorage.getItem('career_goal')
        if (!storedGoal) return

        setHasBootstrappedGoal(true)
        sessionStorage.removeItem('career_goal')
        const bootMessage: TimelineMessage = {
            id: `goal-${Date.now()}`,
            role: 'user',
            content: storedGoal,
            createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, bootMessage])
        void startSession(storedGoal)
    }, [hasBootstrappedGoal, session, user?.id])

    const currentDomain = useMemo(() => getCurrentDomain(session), [session])
    const currentSkill = useMemo(() => getCurrentSkill(session), [session])
    const currentTopic = useMemo(() => getCurrentTopic(session), [session])

    async function startSession(query: string) {
        if (!user?.id) {
            setError('You need to be logged in to start an agent session.')
            return
        }
        setBusy(true)
        setError(null)
        logPipeline('create_session_start', { query, userId: user.id })
        const { data, error: requestError } = await createAgentSession(user.id, query)
        if (requestError || !data) {
            console.error('Failed to create agent session', requestError)
            setError(requestError || 'Failed to create session')
            setBusy(false)
            return
        }
        logPipeline('create_session_success', data)
        setSession(data)
        setMessages(prev => [...prev, buildAssistantMessage(data)])
        setBusy(false)
    }

    async function continueSession(message: string) {
        if (!session || !user?.id) return
        setBusy(true)
        setError(null)
        logPipeline('turn_send', { sessionId: session.session_id, status: session.status, activeAgent: session.active_agent, message })
        const { data, error: requestError } = await sendAgentMessage(session.session_id, user.id, message)
        if (requestError || !data) {
            console.error('Failed to continue agent session', requestError)
            setError(requestError || 'Failed to send message')
            setBusy(false)
            return
        }
        logPipeline('turn_response', data)
        setSession(data)
        setMessages(prev => [...prev, buildAssistantMessage(data)])
        setBusy(false)

        if (profile) {
            const newXP = profile.xp + 10
            setProfile(prev => (prev ? { ...prev, xp: newXP } : null))
            const supabase = createClient()
            if (supabase) await supabase.from('profiles').update({ xp: newXP }).eq('id', user.id)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = input.trim()
        if (!trimmed || busy) return

        const userMessage: TimelineMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, userMessage])
        setInput('')

        if (!session) {
            await startSession(trimmed)
            return
        }
        await continueSession(trimmed)
    }

    function resetChat() {
        logPipeline('session_reset')
        setSession(null)
        setMessages([])
        setInput('')
        setError(null)
        sessionStorage.removeItem(STORAGE_KEYS.session)
        sessionStorage.removeItem(STORAGE_KEYS.messages)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-neutral-50 via-blue-50/20 to-purple-50/10 dark:from-neutral-950 dark:via-blue-950/10 dark:to-purple-950/5">
                <div className="max-w-md rounded-[2rem] glass-premium dark:glass-premium-dark border border-white/20 dark:border-white/10 p-8 text-center">
                    <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Sign in to start your learning session</h1>
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                        The new chat flow is session-based and stores your roadmap, assessments, and memory snapshots per user.
                    </p>
                    <Link href="/auth/login" className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
                        Go to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-neutral-50 via-blue-50/20 to-purple-50/10 dark:from-neutral-950 dark:via-blue-950/10 dark:to-purple-950/5">
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 glass-premium dark:glass-premium-dark border-b border-white/20 dark:border-white/10 sticky top-0 z-30 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 w-full">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 hover:bg-white/50 dark:hover:bg-neutral-800/50 rounded-full smooth-transition">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-base sm:text-lg hidden sm:block bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Career Tutor</h1>
                            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-semibold">Roadmap Path</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ProgressionHeader level={profile?.current_level || 1} xp={profile?.xp || 0} />
                        <div className={`hidden rounded-full border px-3 py-1 text-xs font-semibold sm:block ${statusTone(session?.status || 'idle')}`}>
                            {busy ? 'Processing' : session?.status || 'idle'}
                        </div>
                        <button onClick={() => setIsDashboardOpen(true)} className="p-2.5 bg-white/50 dark:bg-neutral-800/50 rounded-full hover:bg-white dark:hover:bg-neutral-800 smooth-transition shadow-sm hover:shadow-md">
                            <LayoutDashboard className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] w-full">
                <section className="overflow-hidden rounded-[2rem] glass-premium dark:glass-premium-dark border border-white/30 dark:border-white/10 shadow-xl">
                    <div className="border-b border-white/20 dark:border-white/10 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200">
                                {session?.active_agent || 'orchestrator'}
                            </div>
                            <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-700 dark:text-purple-200">
                                {currentDomain?.title || 'No roadmap loaded'}
                            </div>
                            {currentSkill && (
                                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                                    {currentSkill.title}
                                </div>
                            )}
                        </div>
                        <p className="mt-3 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
                            This page mirrors the backend orchestration model directly: roadmap creation, onboarding, human-in-the-loop skill probes,
                            task decomposition, lesson delivery, quizzes, and memory compaction.
                        </p>
                    </div>

                    <div className="max-h-[calc(100vh-280px)] space-y-5 overflow-y-auto p-6">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto min-h-[420px]">
                                <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl">
                                    <Radar className="h-10 w-10 text-neutral-600 dark:text-neutral-300" />
                                </div>
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Start your journey</h2>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    Enter the role you want to pursue. The backend will generate a roadmap, start the knowledge-calibration flow,
                                    and return the first onboarding questions.
                                </p>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.22, delay: index * 0.02 }}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex max-w-[90%] gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-md ${
                                            message.role === 'user'
                                                ? 'bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-100 dark:to-neutral-200 text-white dark:text-neutral-900'
                                                : message.role === 'system'
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                                                    : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
                                        }`}>
                                            {message.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div className={`px-5 py-3.5 rounded-2xl shadow-sm ${
                                            message.role === 'user'
                                                ? 'bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-100 dark:to-neutral-50 text-white dark:text-neutral-900 shadow-md'
                                                : 'glass-premium dark:glass-premium-dark text-neutral-900 dark:text-white border border-white/30 dark:border-white/10'
                                        }`}>
                                            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1">
                                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 glass-premium dark:glass-premium-dark border-t border-white/20 dark:border-white/10 backdrop-blur-xl">
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <input
                                value={input}
                                onChange={event => setInput(event.target.value)}
                                placeholder={inputPlaceholder(session)}
                                className="flex-1 px-5 py-3.5 bg-white/50 dark:bg-neutral-900/50 border-2 border-transparent rounded-xl focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-900 focus-glow smooth-transition outline-none font-medium placeholder:text-neutral-500 dark:placeholder:text-neutral-400 text-neutral-900 dark:text-white"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || busy}
                                className="p-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed smooth-transition shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                            <span>{busy ? 'Waiting for backend orchestration...' : 'Ready for the next turn.'}</span>
                            <button onClick={resetChat} className="font-semibold text-neutral-700 dark:text-neutral-300 transition hover:text-neutral-900 dark:hover:text-white">
                                Reset Session
                            </button>
                        </div>
                    </div>
                </section>

                <aside className="space-y-6">
                    <section className="rounded-[2rem] glass-premium dark:glass-premium-dark p-5 shadow-xl border border-white/30 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-900 dark:text-white">Runtime State</h2>
                        </div>

                        <div className="mt-4 space-y-4 text-sm text-neutral-800 dark:text-neutral-200">
                            <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-neutral-900/50 p-4">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Status</p>
                                <p className="mt-2 font-semibold text-neutral-900 dark:text-white">{session?.status || 'idle'}</p>
                                <p className="mt-1 text-neutral-600 dark:text-neutral-400">{session?.active_agent || 'No active agent yet'}</p>
                            </div>

                            <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-neutral-900/50 p-4">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Current Domain</p>
                                <p className="mt-2 font-semibold text-neutral-900 dark:text-white">{currentDomain?.title || 'Not started'}</p>
                                <p className="mt-1 text-neutral-600 dark:text-neutral-400">{currentDomain?.description || 'No domain selected yet.'}</p>
                            </div>

                            <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-neutral-900/50 p-4">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Current Skill</p>
                                <p className="mt-2 font-semibold text-neutral-900 dark:text-white">{currentSkill?.title || 'Waiting for calibration'}</p>
                                <p className="mt-1 text-neutral-600 dark:text-neutral-400">{currentSkill?.description || 'The knowledge agent will lock onto the frontier skill.'}</p>
                            </div>

                            <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-neutral-900/50 p-4">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">Current Topic</p>
                                <p className="mt-2 font-semibold text-neutral-900 dark:text-white">
                                    {String(currentTopic?.title || currentTopic?.objective || 'Lesson plan not generated yet')}
                                </p>
                                <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                                    Topic index: {session?.state?.current_topic_index ?? 0} / {(session?.state?.lesson_plan || []).length || 0}
                                </p>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            <DashboardSection profile={profile} isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} />

            {error ? (
                <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-100 backdrop-blur-xl">
                    <p className="font-semibold">Pipeline error</p>
                    <p className="mt-1 text-red-700/80 dark:text-red-100/80">{error}</p>
                </div>
            ) : null}
        </div>
    )
}
