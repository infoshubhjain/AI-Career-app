'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'

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
import { DashboardSection } from './components/DashboardSection'
import { ChatSurface } from './components/ChatSurface'
import { ProgressionHeader } from './components/ProgressionHeader'
import { ProjectSidebar } from './components/ProjectSidebar'
import { QuizOverlay } from './components/QuizOverlay'
import { RoadmapRevealOverlay } from './components/RoadmapRevealOverlay'
import { RuntimePanel } from './components/RuntimePanel'
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

function statusTone(status: string) {
    if (status.includes('quiz')) return 'border-[color:var(--accent)] bg-[color:var(--surface-2)] text-[color:var(--accent)]'
    if (status.includes('knowledge')) return 'border-[color:var(--accent-2)] bg-[color:var(--surface-2)] text-[color:var(--accent-2)]'
    if (status.includes('teach')) return 'border-[color:var(--accent-3)] bg-[color:var(--surface-2)] text-[color:var(--accent-3)]'
    if (status.includes('profile')) return 'border-[color:var(--accent)] bg-[color:var(--surface-2)] text-[color:var(--ink)]'
    if (status === 'completed') return 'border-[color:var(--accent)] bg-[color:var(--surface-2)] text-[color:var(--accent)]'
    return 'border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--ink-faint)]'
}

function inputPlaceholder(session: AgentSessionResponse | null, hasPendingQuiz: boolean) {
    if (!session) return 'Describe your ambition.'
    if (hasPendingQuiz) return 'Choose an answer in the quiz overlay...'
    if (session.status === 'awaiting_start_mode') return 'Choose how you want to begin...'
    if (session.status === 'awaiting_topic_followup') return "Ask a follow-up question or type 'ready'..."
    if (session.status.includes('quiz')) return 'Answer the quiz prompt...'
    return 'Type your message...'
}

function eventToTimelineMessage(event: AgentEvent): TimelineMessage | null {
    const responseStatus = typeof event.payload?.status === 'string' ? event.payload.status : null
    if (event.role === 'assistant' && isInitialCalibrationStatus(responseStatus)) {
        return null
    }
    if (event.event_type === 'initial_query') {
        return null
    }
    if (event.role === 'user' && event.payload?.input_mode === 'start_mode') {
        return null
    }
    if (event.role === 'user' && event.payload?.input_mode === 'multiple_choice') {
        return null
    }
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
    const [hasInitialized, setHasInitialized] = useState(false)
    const [dismissedQuizKey, setDismissedQuizKey] = useState<string | null>(null)
    const [roadmapCreationQuery, setRoadmapCreationQuery] = useState('')
    const [isRoadmapLoading, setIsRoadmapLoading] = useState(false)
    const [roadmapRevealLabel, setRoadmapRevealLabel] = useState<string | null>(null)
    const [taskReveal, setTaskReveal] = useState<{ topicTitle: string; skillTitle: string; domainTitle?: string | null } | null>(null)
    const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false)
    const [isRuntimeCollapsed, setIsRuntimeCollapsed] = useState(false)
    const streamingTimerRef = useRef<number | null>(null)
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
        return () => {
            if (streamingTimerRef.current) {
                window.clearInterval(streamingTimerRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!pendingQuizKey) {
            setDismissedQuizKey(null)
            return
        }
        if (dismissedQuizKey && dismissedQuizKey !== pendingQuizKey) {
            setDismissedQuizKey(null)
        }
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

        return () => {
            cancelled = true
        }
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
                    const bootMessage: TimelineMessage = {
                        id: `goal-${Date.now()}`,
                        role: 'user',
                        content: storedGoal,
                        createdAt: new Date().toISOString(),
                    }
                    setMessages([bootMessage])
                    setHasInitialized(true)
                    await startSession(storedGoal)
                    return
                }

                if (loadedProjects.length > 0) {
                    await loadProject(loadedProjects[0].id)
                }
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
        if (requestError || !data) {
            console.error('Failed to load projects', requestError)
            setError(requestError || 'Failed to load projects')
            return []
        }
        setProjects(data)
        if (preferredProjectId) {
            setSelectedProjectId(preferredProjectId)
        }
        return data
    }

    async function loadProject(projectId: string) {
        if (!user?.id) return
        setBusy(true)
        setError(null)
        setSelectedProjectId(projectId)

        const { data: projectData, error: projectError } = await getProjectLatestSession(projectId, user.id)
        if (projectError || !projectData) {
            console.error('Failed to load project session', projectError)
            setError(projectError || 'Failed to load project')
            setBusy(false)
            return
        }

        const latestSession = projectData.session
        if (!latestSession) {
            setSession(null)
            setMessages([])
            setRoadmapRevealLabel(null)
            setBusy(false)
            return
        }

        const { data: eventData, error: eventError } = await listAgentSessionEvents(latestSession.session_id, user.id)
        if (eventError || !eventData) {
            console.error('Failed to load session events', eventError)
            setError(eventError || 'Failed to load session transcript')
            setBusy(false)
            return
        }

        const hydratedSession = hydrateSession(latestSession)
        setSession(hydratedSession)
        setMessages(eventData.map(eventToTimelineMessage).filter((message): message is TimelineMessage => Boolean(message)))
        setRoadmapRevealLabel(
            hydratedSession.status === 'awaiting_start_mode'
                ? toRoadmapLabel(hydratedSession.roadmap?.normalized_title || hydratedSession.roadmap?.query || projectData.project.goal)
                : null
        )
        lastSeenTopicKeyRef.current = getTopicKey(getCurrentTopic(hydratedSession))
        shouldRevealNextTaskRef.current = false
        setBusy(false)
    }

    async function handleDeleteProject(projectId: string) {
        if (!user?.id || busy) return
        const targetProject = projects.find(project => project.id === projectId)
        const confirmed = window.confirm(
            `Delete project "${targetProject?.title || 'this project'}"? This will permanently remove its sessions, transcript, quizzes, and quiz attempts.`
        )
        if (!confirmed) return

        setBusy(true)
        setError(null)
        const { error: requestError } = await deleteAgentProject(projectId, user.id)
        if (requestError) {
            console.error('Failed to delete project', requestError)
            setError(requestError || 'Failed to delete project')
            setBusy(false)
            return
        }

        const remainingProjects = await refreshProjects()
        if (selectedProjectId === projectId) {
            if (remainingProjects.length > 0) {
                await loadProject(remainingProjects[0].id)
            } else {
                setSelectedProjectId(null)
                setSession(null)
                setMessages([])
                setBusy(false)
            }
            return
        }
        setBusy(false)
    }

    async function startSession(query: string) {
        if (!user?.id) {
            setError('You need to be logged in to start an agent session.')
            return
        }
        if (sessionCreationInFlightRef.current) return
        sessionCreationInFlightRef.current = true
        try {
            setBusy(true)
            setError(null)
            setRoadmapCreationQuery(query)
            setIsRoadmapLoading(true)
            shouldRevealNextTaskRef.current = true
            logPipeline('create_session_start', { query, userId: user.id })
            const { data, error: requestError } = await createAgentSession(user.id, query)
            if (requestError || !data) {
                console.error('Failed to create agent session', requestError)
                setError(requestError || 'Failed to create session')
                setBusy(false)
                setIsRoadmapLoading(false)
                return
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
        setBusy(true)
        setError(null)
        shouldRevealNextTaskRef.current = true
        logPipeline('turn_send', { sessionId: session.session_id, status: session.status, activeAgent: session.active_agent, payload })
        const { data, error: requestError } = await sendAgentMessage(session.session_id, payload)
        if (requestError || !data) {
            console.error('Failed to continue agent session', requestError)
            setError(requestError || 'Failed to send message')
            setBusy(false)
            return null
        }

        logPipeline('turn_response', data)
        const { data: syncedSession } = await getAgentSession(data.session_id)
        setSession(syncedSession ? hydrateSession(syncedSession) : data)
        setSelectedProjectId(data.project_id || selectedProjectId)
        if (shouldAppendAssistantTimelineMessage(data)) {
            streamAssistantMessage(data.message)
        }
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

    function streamAssistantMessage(content: string) {
        if (streamingTimerRef.current) {
            window.clearInterval(streamingTimerRef.current)
        }
        const messageId = `assistant-${Date.now()}`
        const createdAt = new Date().toISOString()
        setMessages(prev => [
            ...prev,
            {
                id: messageId,
                role: 'assistant',
                content: '',
                createdAt,
            },
        ])

        let index = 0
        const reveal = () => {
            index = Math.min(index + 6, content.length)
            setMessages(prev =>
                prev.map(message =>
                    message.id === messageId
                        ? {
                              ...message,
                              content: content.slice(0, index),
                          }
                        : message
                )
            )
            if (index >= content.length) {
                if (streamingTimerRef.current) {
                    window.clearInterval(streamingTimerRef.current)
                }
            }
        }

        streamingTimerRef.current = window.setInterval(reveal, 18)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = input.trim()
        if (!trimmed || busy || !user?.id) return

        setInput('')

        if (!session) {
            await startSession(trimmed)
            return
        }

        const userMessage: TimelineMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            createdAt: new Date().toISOString(),
            variant: 'standard',
        }
        setMessages(prev => [...prev, userMessage])

        await continueSession({
            user_id: user.id,
            message: trimmed,
            input_mode: 'text',
        })
    }

    async function handleQuizSelect(optionId: string, optionIndex: number, optionLabel: string) {
        if (!session || !user?.id || !pendingQuestion || busy) return

        if (pendingQuizKey) {
            setDismissedQuizKey(pendingQuizKey)
        }

        await continueSession({
            user_id: user.id,
            message: optionLabel,
            input_mode: 'multiple_choice',
            question_id: pendingQuestion.id,
            selected_option_id: optionId,
            selected_option_index: optionIndex,
        })
    }

    async function handleStartModeSelection(mode: 'beginning' | 'placement') {
        if (!session || !user?.id || busy) return
        const response = await continueSession({
            user_id: user.id,
            message: mode === 'beginning' ? 'Start at beginning' : 'Take placement test',
            input_mode: 'start_mode',
            selected_option_id: mode,
        })
        if (response && response.status !== 'awaiting_start_mode') {
            setRoadmapRevealLabel(null)
        }
    }

    function dismissQuizOverlay() {
        if (!pendingQuizKey || busy) return
        setDismissedQuizKey(pendingQuizKey)
    }

    function reopenQuizOverlay() {
        setDismissedQuizKey(null)
    }

    function beginNewProject() {
        logPipeline('new_project_draft')
        setSelectedProjectId(null)
        setSession(null)
        setMessages([])
        setInput('')
        setError(null)
        setRoadmapCreationQuery('')
        setIsRoadmapLoading(false)
        setRoadmapRevealLabel(null)
        setTaskReveal(null)
        lastSeenTopicKeyRef.current = null
        shouldRevealNextTaskRef.current = false
    }

    const themeVars: CSSProperties & Record<string, string> = {
        '--base': '#0b0c0f',
        '--surface': 'rgba(18,20,26,0.92)',
        '--surface-2': 'rgba(24,28,36,0.76)',
        '--line': 'rgba(255,255,255,0.08)',
        '--line-strong': 'rgba(255,255,255,0.16)',
        '--ink': '#f4f1e9',
        '--ink-soft': '#c9c4b8',
        '--ink-faint': '#8e8a7c',
        '--accent': '#d7b66a',
        '--accent-2': '#7fd1c2',
        '--accent-3': '#8fb4ff',
        fontFamily: "'Sora', sans-serif",
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={themeVars}>
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--accent)]" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[color:var(--base)] text-[color:var(--ink)]" style={themeVars}>
                <style jsx global>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Sora:wght@300;400;500;600&display=swap');
                `}</style>
                <div className="max-w-md rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center shadow-[0_40px_120px_-70px_rgba(0,0,0,0.9)]">
                    <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Sign in to start your learning session
                    </h1>
                    <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
                        Your projects, quizzes, and conversation history are now stored server-side per account.
                    </p>
                    <Link
                        href="/auth/login"
                        className="mt-6 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] px-5 py-3 text-sm font-semibold text-[#1c160a] shadow-[0_18px_60px_-30px_rgba(0,0,0,0.8)]"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen bg-[color:var(--base)] text-[color:var(--ink)]" style={themeVars}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Sora:wght@300;400;500;600&display=swap');
            `}</style>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,_rgba(215,182,106,0.18)_0%,_rgba(11,12,15,0.0)_55%),radial-gradient(70%_60%_at_90%_10%,_rgba(127,209,194,0.12)_0%,_rgba(11,12,15,0.0)_60%),radial-gradient(90%_70%_at_10%_90%,_rgba(143,180,255,0.1)_0%,_rgba(11,12,15,0.0)_55%)]" />

            <div className="relative z-10 flex min-h-screen">
                <div className={`fixed inset-y-0 left-0 z-30 transition-[width] duration-300 ${isProjectsCollapsed ? 'w-7' : 'w-80'} lg:static lg:z-auto`}>
                    <ProjectSidebar
                        projects={projects}
                        selectedProjectId={selectedProjectId}
                        busy={busy}
                        onSelect={projectId => void loadProject(projectId)}
                        onDelete={projectId => void handleDeleteProject(projectId)}
                        onStartNew={beginNewProject}
                        collapsed={isProjectsCollapsed}
                        onToggleCollapse={() => setIsProjectsCollapsed(prev => !prev)}
                        className="h-full"
                    />
                </div>

                <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink)] transition hover:border-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                                aria-label="Back to home"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--ink-faint)]">Projectia Tutor</p>
                                <h1 className="text-lg font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                    Immersive Chat Studio
                                </h1>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className={`hidden rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] sm:inline-flex ${statusTone(session?.status || 'idle')}`}>
                                {busy ? 'Processing' : session?.status || 'idle'}
                            </div>
                            <ProgressionHeader level={profile?.current_level || 1} xp={profile?.xp || 0} />
                            <button
                                onClick={() => setIsDashboardOpen(true)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink)] transition hover:border-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                                aria-label="Open dashboard"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                            </button>
                        </div>
                    </header>

                    <ChatSurface
                        session={session}
                        selectedProjectId={selectedProjectId}
                        currentDomain={currentDomain}
                        currentSkill={currentSkill}
                        currentTopic={currentTopic}
                        isEntryMode={isEntryMode}
                        isLearningMode={isLearningMode}
                        totalDomains={totalDomains}
                        currentDomainIndex={currentDomainIndex}
                        totalSkillsInDomain={totalSkillsInDomain}
                        currentSkillIndex={currentSkillIndex}
                        totalTopics={totalTopics}
                        messages={messages}
                        messagesEndRef={messagesEndRef}
                        pendingQuestion={pendingQuestion}
                        isQuizOverlayOpen={isQuizOverlayOpen}
                        isStartModeOverlayOpen={isStartModeOverlayOpen}
                        busy={busy}
                        input={input}
                        inputPlaceholder={inputPlaceholder(session, Boolean(pendingQuestion))}
                        roadmapCreationQuery={roadmapCreationQuery}
                        isRoadmapLoading={isRoadmapLoading}
                        onInputChange={setInput}
                        onSubmit={handleSubmit}
                        onReopenQuizOverlay={reopenQuizOverlay}
                        onBeginNewProject={beginNewProject}
                    />
                </main>

                <div className={`fixed inset-y-0 right-0 z-30 transition-[width] duration-300 ${isRuntimeCollapsed ? 'w-7' : 'w-80'} lg:static lg:z-auto`}>
                    <RuntimePanel
                        session={session}
                        currentDomain={currentDomain}
                        currentSkill={currentSkill}
                        currentTopic={currentTopic}
                        collapsed={isRuntimeCollapsed}
                        onToggleCollapse={() => setIsRuntimeCollapsed(prev => !prev)}
                        className="h-full"
                    />
                </div>
            </div>

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

            {pendingQuestion && isQuizOverlayOpen ? (
                <QuizOverlay question={pendingQuestion} busy={busy} error={error} onSelect={handleQuizSelect} onClose={dismissQuizOverlay} />
            ) : null}

            {error ? (
                <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200 backdrop-blur-xl">
                    <p className="font-semibold">Pipeline error</p>
                    <p className="mt-1 text-red-200/80">{error}</p>
                </div>
            ) : null}
        </div>
    )
}
