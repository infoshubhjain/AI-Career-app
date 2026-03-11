'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
    ArrowLeft, Bot, ChevronRight, LayoutDashboard,
    Radar, User as UserIcon, Menu, X, Sparkles,
    Loader2, PlusCircle
} from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import {
    createAgentSession,
    deleteAgentProject,
    getAgentSession,
    getProjectLatestSession,
    listAgentProjects,
    listAgentSessionEvents,
    sendAgentMessage,
    type AgentTurnPayload,
} from '@/app/lib/agent-api'
import { AnimatedAIChatInput } from '@/components/ui/animated-ai-chat'
import { DashboardSection } from './components/DashboardSection'
import { JourneyStatusCard } from './components/JourneyStatusCard'
import { ProgressionHeader } from './components/ProgressionHeader'
import { ProjectSidebar } from './components/ProjectSidebar'
import { QuizOverlay } from './components/QuizOverlay'
import { RoadmapCreationCanvas } from './components/RoadmapCreationCanvas'
import { RoadmapRevealOverlay } from './components/RoadmapRevealOverlay'
import { TaskRevealOverlay } from './components/TaskRevealOverlay'
import {
    AgentEvent,
    AgentProjectSummary,
    AgentRoadmapDomain,
    AgentRoadmapSkill,
    AgentSessionResponse,
    AgentSessionStateResponse,
    UserProfile,
} from '@/types'

type TimelineMessage = {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt: string
    variant?: 'ambition' | 'standard'
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

function toRoadmapLabel(value: string | null | undefined) {
    const source = (value || '').trim()
    if (!source) return 'Untitled Roadmap'
    return source
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(part => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(' ')
}

function getTopicKey(topic: Record<string, unknown> | null) {
    const raw = topic?.id || topic?.title || topic?.objective
    return typeof raw === 'string' ? raw : null
}

function isInitialCalibrationStatus(status: string | null | undefined) {
    return status === 'awaiting_start_mode' || status === 'awaiting_profile' || status === 'awaiting_knowledge_answer'
}

function shouldAppendAssistantTimelineMessage(response: AgentSessionResponse) {
    return !isInitialCalibrationStatus(response.status)
}

function statusLabel(status: string, busy: boolean) {
    if (busy) return { label: 'Thinking…', color: 'text-blue-500 dark:text-blue-400' }
    if (status.includes('quiz')) return { label: 'Quiz', color: 'text-amber-600 dark:text-amber-400' }
    if (status.includes('knowledge')) return { label: 'Calibrating', color: 'text-blue-600 dark:text-blue-400' }
    if (status.includes('topic_followup')) return { label: 'Learning', color: 'text-emerald-600 dark:text-emerald-400' }
    if (status === 'completed') return { label: 'Complete', color: 'text-purple-600 dark:text-purple-400' }
    if (status === 'idle') return { label: 'Ready', color: 'text-neutral-500 dark:text-neutral-400' }
    return { label: status.replace(/_/g, ' '), color: 'text-neutral-500 dark:text-neutral-400' }
}

function inputPlaceholder(session: AgentSessionResponse | null, hasPendingQuiz: boolean) {
    if (!session) return 'Enter your career goal to get started…'
    if (hasPendingQuiz) return 'Answer the quiz above first…'
    if (session.status === 'awaiting_start_mode') return 'Choose how you want to begin…'
    if (session.status === 'awaiting_topic_followup') return "Ask a follow-up or type 'ready' to continue…"
    if (session.status.includes('quiz')) return 'Answer the quiz prompt…'
    return 'Message your AI tutor…'
}

function eventToTimelineMessage(event: AgentEvent): TimelineMessage | null {
    const responseStatus = typeof event.payload?.status === 'string' ? event.payload.status : null
    if (event.role === 'assistant' && isInitialCalibrationStatus(responseStatus)) return null
    if (event.event_type === 'initial_query') return null
    if (event.role === 'user' && event.payload?.input_mode === 'start_mode') return null
    if (event.role === 'user' && event.payload?.input_mode === 'multiple_choice') return null

    const content =
        event.content ||
        (typeof event.payload?.message === 'string' ? event.payload.message : '') ||
        (typeof event.payload?.query === 'string' ? event.payload.query : '')

    if (!content) return null

    return {
        id: `${event.id}`,
        role: event.role,
        content,
        createdAt: event.created_at,
        variant: event.event_type === 'initial_query' ? 'ambition' : 'standard',
    }
}

function hydrateSession(stateResponse: AgentSessionStateResponse): AgentSessionResponse {
    return {
        session_id: stateResponse.session_id,
        project_id: stateResponse.project_id,
        user_id: stateResponse.user_id,
        status: stateResponse.status,
        active_agent: stateResponse.active_agent,
        message: '',
        roadmap: stateResponse.roadmap,
        pending_questions: stateResponse.pending_questions,
        state: stateResponse.state,
    }
}

function expectsQuizOverlay(nextSession: AgentSessionResponse | null) {
    if (!nextSession) return false
    if (Boolean(nextSession.pending_questions?.length)) return true
    if (nextSession.status === 'awaiting_profile') return true
    if (nextSession.status.includes('quiz')) return true
    return Boolean(nextSession.state?.active_quiz_id)
}

export default function ChatPage() {
    const { user, loading } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [projects, setProjects] = useState<AgentProjectSummary[]>([])
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [session, setSession] = useState<AgentSessionResponse | null>(null)
    const [messages, setMessages] = useState<TimelineMessage[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDashboardOpen, setIsDashboardOpen] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)
    const [dismissedQuizKey, setDismissedQuizKey] = useState<string | null>(null)
    const [roadmapCreationQuery, setRoadmapCreationQuery] = useState('')
    const [isRoadmapLoading, setIsRoadmapLoading] = useState(false)
    const [roadmapRevealLabel, setRoadmapRevealLabel] = useState<string | null>(null)
    const [taskReveal, setTaskReveal] = useState<{ topicTitle: string; skillTitle: string; domainTitle?: string | null } | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const initializationStartedRef = useRef(false)
    const sessionCreationInFlightRef = useRef(false)
    const lastSeenTopicKeyRef = useRef<string | null>(null)
    const shouldRevealNextTaskRef = useRef(false)

    const currentDomain = useMemo(() => getCurrentDomain(session), [session])
    const currentSkill = useMemo(() => getCurrentSkill(session), [session])
    const currentTopic = useMemo(() => getCurrentTopic(session), [session])
    const currentTopicKey = useMemo(() => getTopicKey(currentTopic), [currentTopic])
    const pendingQuestion = useMemo(() => session?.pending_questions?.[0] || null, [session])
    const isStartModeOverlayOpen = Boolean(roadmapRevealLabel) && session?.status === 'awaiting_start_mode'
    const pendingQuizKey = useMemo(
        () => (session?.session_id && pendingQuestion?.id ? `${session.session_id}:${pendingQuestion.id}` : null),
        [pendingQuestion?.id, session?.session_id]
    )
    const isQuizOverlayOpen = Boolean(pendingQuestion) && pendingQuizKey !== dismissedQuizKey
    const isEntryMode = !session && !selectedProjectId
    const isLearningMode = Boolean(session)
    const totalDomains = session?.roadmap?.domains?.length || 0
    const currentDomainIndex = session?.state?.roadmap_progress?.domain_index ?? 0
    const currentSkillIndex = session?.state?.roadmap_progress?.skill_index ?? 0
    const totalSkillsInDomain = currentDomain?.subdomains?.length || 0
    const totalTopics = (session?.state?.lesson_plan || []).length
    const { label: statusText, color: statusColor } = statusLabel(session?.status || 'idle', busy)

    useEffect(() => {
        if (user?.id) {
            const fetchProfile = async () => {
                const supabase = createClient()
                if (!supabase) return
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                setProfile(data)
            }
            void fetchProfile()
        }
    }, [user?.id])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (!pendingQuizKey) { setDismissedQuizKey(null); return }
        if (dismissedQuizKey && dismissedQuizKey !== pendingQuizKey) setDismissedQuizKey(null)
    }, [dismissedQuizKey, pendingQuizKey])

    useEffect(() => {
        if (!session?.session_id || !currentTopicKey) {
            if (!session?.session_id) {
                lastSeenTopicKeyRef.current = null
                shouldRevealNextTaskRef.current = false
            }
            return
        }
        if (lastSeenTopicKeyRef.current === currentTopicKey) return
        if (shouldRevealNextTaskRef.current && !isInitialCalibrationStatus(session.status)) {
            setTaskReveal({
                topicTitle: String(currentTopic?.title || currentTopic?.objective || 'Next learning task'),
                skillTitle: currentSkill?.title || 'Current skill',
                domainTitle: currentDomain?.title || null,
            })
            shouldRevealNextTaskRef.current = false
        }
        lastSeenTopicKeyRef.current = currentTopicKey
    }, [currentDomain?.title, currentSkill?.title, currentTopic, currentTopicKey, session?.session_id, session?.status])

    useEffect(() => {
        if (!session?.session_id || pendingQuestion || !expectsQuizOverlay(session)) return
        let cancelled = false
        const syncExpectedQuizState = async () => {
            const { data, error: requestError } = await getAgentSession(session.session_id)
            if (cancelled || requestError || !data) return
            const hydrated = hydrateSession(data)
            if (!hydrated.pending_questions.length && !hydrated.state?.active_quiz_id) return
            setSession(hydrated)
        }
        void syncExpectedQuizState()
        return () => { cancelled = true }
    }, [pendingQuestion, session])

    useEffect(() => {
        if (!user?.id || hasInitialized || initializationStartedRef.current) return
        initializationStartedRef.current = true
        const initialize = async () => {
            try {
                const storedGoal = sessionStorage.getItem('career_goal')
                const loadedProjects = await refreshProjects()
                if (storedGoal) {
                    sessionStorage.removeItem('career_goal')
                    setMessages([{ id: `goal-${Date.now()}`, role: 'user', content: storedGoal, createdAt: new Date().toISOString() }])
                    setHasInitialized(true)
                    await startSession(storedGoal)
                    return
                }
                if (loadedProjects.length > 0) await loadProject(loadedProjects[0].id)
                setHasInitialized(true)
            } catch (error) {
                initializationStartedRef.current = false
                console.error('Failed to initialize chat page', error)
            }
        }
        void initialize()
    }, [hasInitialized, user?.id])

    async function refreshProjects(preferredProjectId?: string) {
        if (!user?.id) return []
        const { data, error: requestError } = await listAgentProjects(user.id)
        if (requestError || !data) { setError(requestError || 'Failed to load projects'); return [] }
        setProjects(data)
        if (preferredProjectId) setSelectedProjectId(preferredProjectId)
        return data
    }

    async function loadProject(projectId: string) {
        if (!user?.id) return
        setBusy(true); setError(null); setSelectedProjectId(projectId)
        const { data: projectData, error: projectError } = await getProjectLatestSession(projectId, user.id)
        if (projectError || !projectData) { setError(projectError || 'Failed to load project'); setBusy(false); return }
        const latestSession = projectData.session
        if (!latestSession) { setSession(null); setMessages([]); setRoadmapRevealLabel(null); setBusy(false); return }
        const { data: eventData, error: eventError } = await listAgentSessionEvents(latestSession.session_id, user.id)
        if (eventError || !eventData) { setError(eventError || 'Failed to load session transcript'); setBusy(false); return }
        const hydratedSession = hydrateSession(latestSession)
        setSession(hydratedSession)
        setMessages(eventData.map(eventToTimelineMessage).filter((m): m is TimelineMessage => Boolean(m)))
        setRoadmapRevealLabel(
            hydratedSession.status === 'awaiting_start_mode'
                ? toRoadmapLabel(hydratedSession.roadmap?.normalized_title || hydratedSession.roadmap?.query || projectData.project.goal)
                : null
        )
        lastSeenTopicKeyRef.current = getTopicKey(getCurrentTopic(hydratedSession))
        shouldRevealNextTaskRef.current = false
        setBusy(false)
        setIsSidebarOpen(false)
    }

    async function handleDeleteProject(projectId: string) {
        if (!user?.id || busy) return
        const targetProject = projects.find(p => p.id === projectId)
        if (!window.confirm(`Delete "${targetProject?.title || 'this project'}"? This cannot be undone.`)) return
        setBusy(true); setError(null)
        const { error: requestError } = await deleteAgentProject(projectId, user.id)
        if (requestError) { setError(requestError || 'Failed to delete project'); setBusy(false); return }
        const remainingProjects = await refreshProjects()
        if (selectedProjectId === projectId) {
            if (remainingProjects.length > 0) await loadProject(remainingProjects[0].id)
            else { setSelectedProjectId(null); setSession(null); setMessages([]); setBusy(false) }
            return
        }
        setBusy(false)
    }

    async function startSession(query: string) {
        if (!user?.id) { setError('You need to be logged in.'); return }
        if (sessionCreationInFlightRef.current) return
        sessionCreationInFlightRef.current = true
        try {
            setBusy(true); setError(null)
            setRoadmapCreationQuery(query); setIsRoadmapLoading(true)
            shouldRevealNextTaskRef.current = true
            logPipeline('create_session_start', { query, userId: user.id })
            const learningStyle = sessionStorage.getItem('learning_style')
            if (learningStyle) sessionStorage.removeItem('learning_style')
            const { data, error: requestError } = await createAgentSession(user.id, query, learningStyle)
            if (requestError || !data) {
                setError(requestError || 'Failed to create session')
                setBusy(false); setIsRoadmapLoading(false); return
            }
            logPipeline('create_session_success', data)
            const { data: syncedSession } = await getAgentSession(data.session_id)
            setSession(syncedSession ? hydrateSession(syncedSession) : data)
            setSelectedProjectId(data.project_id || null)
            setIsRoadmapLoading(false)
            setRoadmapRevealLabel(toRoadmapLabel(data.roadmap?.normalized_title || data.roadmap?.query || query))
            await refreshProjects(data.project_id || undefined)
            setBusy(false)
        } finally {
            sessionCreationInFlightRef.current = false
        }
    }

    async function continueSession(payload: AgentTurnPayload) {
        if (!session || !user?.id) return
        setBusy(true); setError(null)
        shouldRevealNextTaskRef.current = true
        logPipeline('turn_send', { sessionId: session.session_id, status: session.status, payload })
        const { data, error: requestError } = await sendAgentMessage(session.session_id, payload)
        if (requestError || !data) { setError(requestError || 'Failed to send message'); setBusy(false); return null }
        logPipeline('turn_response', data)
        const { data: syncedSession } = await getAgentSession(data.session_id)
        setSession(syncedSession ? hydrateSession(syncedSession) : data)
        setSelectedProjectId(data.project_id || selectedProjectId)
        if (shouldAppendAssistantTimelineMessage(data)) setMessages(prev => [...prev, buildAssistantMessage(data)])
        await refreshProjects(data.project_id || selectedProjectId || undefined)
        setBusy(false)
        if (profile) {
            const newXP = profile.xp + 10
            setProfile(prev => (prev ? { ...prev, xp: newXP } : null))
            const supabase = createClient()
            if (supabase) await supabase.from('profiles').update({ xp: newXP }).eq('id', user.id)
        }
        return data
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = input.trim()
        if (!trimmed || busy || !user?.id) return
        setInput('')
        if (!session) { await startSession(trimmed); return }
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: trimmed, createdAt: new Date().toISOString(), variant: 'standard' }])
        await continueSession({ user_id: user.id, message: trimmed, input_mode: 'text' })
    }

    async function handleQuizSelect(optionId: string, optionIndex: number, optionLabel: string) {
        if (!session || !user?.id || !pendingQuestion || busy) return
        await continueSession({ user_id: user.id, message: optionLabel, input_mode: 'multiple_choice', question_id: pendingQuestion.id, selected_option_id: optionId, selected_option_index: optionIndex })
    }

    async function handleStartModeSelection(mode: 'beginning' | 'placement') {
        if (!session || !user?.id || busy) return
        const response = await continueSession({ user_id: user.id, message: mode === 'beginning' ? 'Start at beginning' : 'Take placement test', input_mode: 'start_mode', selected_option_id: mode })
        if (response && response.status !== 'awaiting_start_mode') setRoadmapRevealLabel(null)
    }

    function dismissQuizOverlay() { if (!pendingQuizKey || busy) return; setDismissedQuizKey(pendingQuizKey) }
    function reopenQuizOverlay() { setDismissedQuizKey(null) }

    function beginNewProject() {
        setSelectedProjectId(null); setSession(null); setMessages([])
        setInput(''); setError(null); setRoadmapCreationQuery('')
        setIsRoadmapLoading(false); setRoadmapRevealLabel(null); setTaskReveal(null)
        lastSeenTopicKeyRef.current = null; shouldRevealNextTaskRef.current = false
        setIsSidebarOpen(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading workspace…</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950">
                <div className="max-w-sm w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Sign in to continue</h1>
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Your projects and progress are saved to your account.</p>
                    <Link href="/auth/login" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity">
                        Sign In
                    </Link>
                </div>
            </div>
        )
    }

    const projectTitle = projects.find(p => p.id === selectedProjectId)?.title

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
            {/* ── Mobile sidebar backdrop ── */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <aside className={`
                fixed lg:relative inset-y-0 left-0 z-40 flex flex-col
                bg-white dark:bg-neutral-900
                border-r border-neutral-200 dark:border-neutral-800
                transition-all duration-300 ease-in-out shrink-0
                ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 lg:translate-x-0'}
                ${isSidebarCollapsed ? 'lg:w-0 lg:border-r-0 lg:overflow-hidden' : 'lg:w-72'}
            `}>
                {/* Sidebar header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">Career AI</span>
                    </Link>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 lg:hidden transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* New project button */}
                <div className="px-3 pt-3">
                    <button
                        onClick={beginNewProject}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4 text-blue-500" />
                        New Project
                    </button>
                </div>

                {/* Projects list */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    <ProjectSidebar
                        projects={projects}
                        selectedProjectId={selectedProjectId}
                        busy={busy}
                        onSelect={projectId => void loadProject(projectId)}
                        onDelete={projectId => void handleDeleteProject(projectId)}
                        onStartNew={beginNewProject}
                        compact
                    />
                </div>

                {/* Sidebar footer — progression */}
                {profile && (
                    <div className="px-4 py-4 border-t border-neutral-200 dark:border-neutral-800">
                        <ProgressionHeader level={profile.current_level || 1} xp={profile.xp || 0} />
                    </div>
                )}
            </aside>

            {/* ── Main area ── */}
            <div className="flex flex-col flex-1 min-w-0 h-full">

                {/* Top bar */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile: open drawer. Desktop: toggle collapse */}
                        <button
                            onClick={() => {
                                if (window.innerWidth >= 1024) setIsSidebarCollapsed(v => !v)
                                else setIsSidebarOpen(true)
                            }}
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                            title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Link href="/" className="hidden lg:flex p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                                {projectTitle || (isEntryMode ? 'New Project' : 'Career Tutor')}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {busy && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                                <p className={`text-xs font-medium ${statusColor}`}>{statusText}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isLearningMode && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs">
                                <span className="text-neutral-500 dark:text-neutral-400">Agent:</span>
                                <span className="font-medium text-neutral-700 dark:text-neutral-200">{session?.active_agent || 'orchestrator'}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsDashboardOpen(true)}
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                            title="Open dashboard"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Journey status bar (only in learning mode) */}
                <AnimatePresence>
                    {isLearningMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 shrink-0 overflow-hidden"
                        >
                            <div className="px-4 py-3">
                                <JourneyStatusCard
                                    domainTitle={currentDomain?.title || 'Roadmap loading'}
                                    skillTitle={currentSkill?.title || 'Knowledge tracing in progress'}
                                    topicTitle={String(currentTopic?.title || currentTopic?.objective || 'Lecture unlocks after tracing')}
                                    domainProgressLabel={totalDomains > 0 ? `${Math.min(currentDomainIndex + 1, totalDomains)} / ${totalDomains}` : '—'}
                                    skillProgressLabel={totalSkillsInDomain > 0 ? `${Math.min(currentSkillIndex + 1, totalSkillsInDomain)} / ${totalSkillsInDomain}` : '—'}
                                    topicProgressLabel={totalTopics > 0 ? `${Math.min((session?.state?.current_topic_index ?? 0) + 1, totalTopics)} / ${totalTopics}` : '—'}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto">
                    <RoadmapCreationCanvas visible={isRoadmapLoading} ambition={roadmapCreationQuery} />

                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 space-y-5 max-w-lg mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Radar className="w-8 h-8 text-blue-500/70" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">What's your career goal?</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    Describe what you want to become or build. Your AI tutor will generate a personalized roadmap, calibrate your level, and guide you step by step.
                                </p>
                            </div>
                            {projects.length > 0 && (
                                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                    Or pick a previous project from the sidebar →
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                            {messages.map((message, index) => (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.15) }}
                                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-sm ${
                                        message.role === 'user'
                                            ? 'bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900'
                                            : message.role === 'system'
                                                ? 'bg-amber-500'
                                                : 'bg-gradient-to-br from-blue-500 to-purple-500'
                                    }`}>
                                        {message.role === 'user'
                                            ? <UserIcon className="w-3.5 h-3.5" />
                                            : <Bot className="w-3.5 h-3.5" />
                                        }
                                    </div>

                                    {/* Bubble */}
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                                        message.role === 'user'
                                            ? message.variant === 'ambition'
                                                ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                                                : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                                            : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white'
                                    }`}>
                                        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>pre]:bg-neutral-100 [&>pre]:dark:bg-neutral-900 [&>pre]:rounded-lg [&>pre]:p-3 [&>code]:bg-neutral-100 [&>code]:dark:bg-neutral-900 [&>code]:rounded [&>code]:px-1">
                                            <ReactMarkdown>{message.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Thinking indicator */}
                            {busy && messages.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3 shadow-sm">
                                        <div className="flex gap-1 items-center h-5">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500"
                                                    animate={{ y: [0, -4, 0] }}
                                                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input area */}
                <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4">
                    {/* Quiz paused banner */}
                    {pendingQuestion && !isQuizOverlayOpen && (
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 text-sm">
                            <div>
                                <p className="font-semibold text-amber-800 dark:text-amber-200">Quiz waiting</p>
                                <p className="text-amber-700/70 dark:text-amber-100/60 text-xs mt-0.5">Answer the quiz to continue your session.</p>
                            </div>
                            <button
                                onClick={reopenQuizOverlay}
                                disabled={busy}
                                className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-100 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
                            >
                                Open Quiz <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    <div className="max-w-3xl mx-auto">
                        <AnimatedAIChatInput
                            value={input}
                            onChange={setInput}
                            onSubmit={handleSubmit}
                            placeholder={inputPlaceholder(session, Boolean(pendingQuestion))}
                            disabled={isStartModeOverlayOpen || Boolean(pendingQuestion)}
                            busy={busy}
                        />
                        <p className="mt-2 text-center text-[11px] text-neutral-400 dark:text-neutral-600">
                            Press Enter to send · Shift+Enter for new line
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Overlays ── */}
            <DashboardSection profile={profile} isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} />

            <RoadmapRevealOverlay
                visible={isStartModeOverlayOpen}
                roadmapLabel={roadmapRevealLabel || 'Untitled Roadmap'}
                busy={busy}
                onStartAtBeginning={() => void handleStartModeSelection('beginning')}
                onTakePlacementTest={() => void handleStartModeSelection('placement')}
            />

            <TaskRevealOverlay
                visible={Boolean(taskReveal)}
                topicTitle={taskReveal?.topicTitle || 'Next learning task'}
                skillTitle={taskReveal?.skillTitle || 'Current skill'}
                domainTitle={taskReveal?.domainTitle}
                onComplete={() => setTaskReveal(null)}
            />

            {pendingQuestion && isQuizOverlayOpen && (
                <QuizOverlay question={pendingQuestion} busy={busy} error={error} onSelect={handleQuizSelect} onClose={dismissQuizOverlay} />
            )}

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-neutral-900 p-4 shadow-xl"
                    >
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">Error</p>
                        <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{error}</p>
                        <button onClick={() => setError(null)} className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
