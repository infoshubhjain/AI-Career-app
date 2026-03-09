'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Bot, ChevronRight, LayoutDashboard, Radar, Send, Target, User as UserIcon } from 'lucide-react'

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

function statusTone(status: string) {
    if (status.includes('quiz')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-400/30'
    if (status.includes('knowledge')) return 'bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-400/30'
    if (status.includes('teach')) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-400/30'
    if (status.includes('profile')) return 'bg-sky-500/15 text-sky-700 dark:text-sky-200 border-sky-400/30'
    if (status === 'completed') return 'bg-purple-500/15 text-purple-700 dark:text-purple-200 border-purple-400/30'
    return 'bg-white/50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-200 border-white/20 dark:border-white/10'
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
            setMessages(prev => [...prev, buildAssistantMessage(data)])
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
                        Your projects, quizzes, and conversation history are now stored server-side per account.
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
                            <p className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase tracking-wider font-semibold">Projects Workspace</p>
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

            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_340px] w-full">
                <ProjectSidebar
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    busy={busy}
                    onSelect={projectId => void loadProject(projectId)}
                    onDelete={projectId => void handleDeleteProject(projectId)}
                    onStartNew={beginNewProject}
                />

                <section className="relative overflow-hidden rounded-[2rem] glass-premium dark:glass-premium-dark border border-white/30 dark:border-white/10 shadow-xl">
                    <RoadmapCreationCanvas visible={isRoadmapLoading} ambition={roadmapCreationQuery} />
                    <div className="border-b border-white/20 dark:border-white/10 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200">
                                {session?.active_agent || 'orchestrator'}
                            </div>
                            <div className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-700 dark:text-purple-200">
                                {currentDomain?.title || (selectedProjectId ? 'Project loaded' : 'No project selected')}
                            </div>
                            {currentSkill && (
                                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
                                    {currentSkill.title}
                                </div>
                            )}
                        </div>
                        <p className="mt-3 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
                            {isEntryMode
                                ? 'Describe your ambition to generate a roadmap, trace your current knowledge, and unlock the guided lecture flow.'
                                : 'This workspace stores your roadmap sessions, generated quizzes, adaptive knowledge state, and transcript on the backend.'}
                        </p>
                    </div>

                    <div className="max-h-[calc(100vh-280px)] space-y-5 overflow-y-auto p-6">
                        {isLearningMode ? (
                            <JourneyStatusCard
                                domainTitle={currentDomain?.title || 'Roadmap loading'}
                                skillTitle={currentSkill?.title || 'Knowledge tracing in progress'}
                                topicTitle={String(currentTopic?.title || currentTopic?.objective || 'Lecture unlocks after tracing')}
                                domainProgressLabel={totalDomains > 0 ? `Domain ${Math.min(currentDomainIndex + 1, totalDomains)} of ${totalDomains}` : 'Preparing your roadmap'}
                                skillProgressLabel={totalSkillsInDomain > 0 ? `Skill ${Math.min(currentSkillIndex + 1, totalSkillsInDomain)} of ${totalSkillsInDomain} in this domain` : 'Waiting for current skill'}
                                topicProgressLabel={totalTopics > 0 ? `Topic ${Math.min((session?.state?.current_topic_index ?? 0) + 1, totalTopics)} of ${totalTopics}` : 'No topic lecture yet'}
                            />
                        ) : null}
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto min-h-[420px]">
                                <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl">
                                    <Radar className="h-10 w-10 text-neutral-600 dark:text-neutral-300" />
                                </div>
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Describe your ambition</h2>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    Tell the tutor what you want to become or build. We will generate the roadmap, reveal the selected track, calibrate your level, and then begin the lecture.
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
                                                ? message.variant === 'ambition'
                                                    ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md ring-1 ring-white/10'
                                                    : 'bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-100 dark:to-neutral-50 text-white dark:text-neutral-900 shadow-md'
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
                        {pendingQuestion && !isQuizOverlayOpen ? (
                            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                                <div>
                                    <p className="font-semibold">Quiz paused</p>
                                    <p className="mt-1 text-amber-900/75 dark:text-amber-100/75">
                                        This project is still waiting on a quiz answer before the session can continue.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={reopenQuizOverlay}
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 font-semibold text-amber-900 transition hover:bg-amber-500/25 dark:text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Continue Quiz
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <input
                                value={input}
                                onChange={event => setInput(event.target.value)}
                                placeholder={inputPlaceholder(session, Boolean(pendingQuestion))}
                                disabled={isStartModeOverlayOpen || Boolean(pendingQuestion) || busy}
                                className="flex-1 px-5 py-3.5 bg-white/50 dark:bg-neutral-900/50 border-2 border-transparent rounded-xl focus:border-blue-500/50 focus:bg-white dark:focus:bg-neutral-900 focus-glow smooth-transition outline-none font-medium placeholder:text-neutral-500 dark:placeholder:text-neutral-400 text-neutral-900 dark:text-white"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isStartModeOverlayOpen || busy || Boolean(pendingQuestion)}
                                className="p-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed smooth-transition shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                            <span>{busy ? 'Waiting for backend orchestration...' : 'Ready for the next turn.'}</span>
                            <button onClick={beginNewProject} className="font-semibold text-neutral-700 dark:text-neutral-300 transition hover:text-neutral-900 dark:hover:text-white">
                                Start New Project
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
                <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-100 backdrop-blur-xl">
                    <p className="font-semibold">Pipeline error</p>
                    <p className="mt-1 text-red-700/80 dark:text-red-100/80">{error}</p>
                </div>
            ) : null}
        </div>
    )
}
