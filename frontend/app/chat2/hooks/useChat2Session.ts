'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { User } from '@supabase/supabase-js'

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
import type { AgentProjectSummary, AgentQuestion, AgentSessionResponse, QuizOutcomeFeedback, UserProfile } from '@/types'

import {
    dungeonBufferToMessages,
    type DungeonTimelineMessage,
    type DungeonUiPhase,
} from '@/app/chat/components/DungeonExperience'
import { getChatScrollStorageKey, snapLectureThreadToBottom } from '@/app/lib/chatScrollPersistence'

import {
    chat2InputPlaceholder,
    eventToTimelineMessage,
    expectsQuizOverlay,
    getCurrentDomain,
    getCurrentSkill,
    getCurrentTopic,
    getTopicKey,
    hydrateSession,
    isInitialCalibrationStatus,
    shouldAppendAssistantTimelineMessage,
    toRoadmapLabel,
    type Chat2TimelineMessage,
} from '../sessionUtils'

export function useChat2Session(user: User | null, scrollContainerRef?: RefObject<HTMLDivElement | null>) {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [projects, setProjects] = useState<AgentProjectSummary[]>([])
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [session, setSession] = useState<AgentSessionResponse | null>(null)
    const [messages, setMessages] = useState<Chat2TimelineMessage[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasInitialized, setHasInitialized] = useState(false)
    const [dismissedQuizKey, setDismissedQuizKey] = useState<string | null>(null)
    const [roadmapCreationQuery, setRoadmapCreationQuery] = useState('')
    const [isRoadmapLoading, setIsRoadmapLoading] = useState(false)
    const [roadmapRevealLabel, setRoadmapRevealLabel] = useState<string | null>(null)
    const [taskReveal, setTaskReveal] = useState<{
        topicTitle: string
        skillTitle: string
        domainTitle?: string | null
    } | null>(null)
    const [quizSubmitting, setQuizSubmitting] = useState(false)
    const [displayedQuestion, setDisplayedQuestion] = useState<AgentQuestion | null>(null)
    const [queuedQuestion, setQueuedQuestion] = useState<AgentQuestion | null>(null)
    const [quizDrafts, setQuizDrafts] = useState<Record<string, number | null>>({})
    const [quizOutcomeFeedback, setQuizOutcomeFeedback] = useState<QuizOutcomeFeedback | null>(null)
    const [outcomeAnchorQuestion, setOutcomeAnchorQuestion] = useState<AgentQuestion | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [dashboardStubOpen, setDashboardStubOpen] = useState(false)

    const queuedQuestionRef = useRef<AgentQuestion | null>(null)
    const streamingTimerRef = useRef<number | null>(null)
    const dungeonStreamTimerRef = useRef<number | null>(null)
    const snapLectureAfterDungeonExitRef = useRef(false)
    const [dungeonPhase, setDungeonPhase] = useState<DungeonUiPhase>('hidden')
    const [dungeonMessages, setDungeonMessages] = useState<DungeonTimelineMessage[]>([])
    const [dungeonInput, setDungeonInput] = useState('')
    const [dungeonOutcome, setDungeonOutcome] = useState<'success' | 'failure' | null>(null)
    const initializationStartedRef = useRef(false)
    const sessionCreationInFlightRef = useRef(false)
    const lastSeenTopicKeyRef = useRef<string | null>(null)
    const shouldRevealNextTaskRef = useRef(false)
    const userId = user?.id

    const currentDomain = useMemo(() => getCurrentDomain(session), [session])
    const currentSkill = useMemo(() => getCurrentSkill(session), [session])
    const currentTopic = useMemo(() => getCurrentTopic(session), [session])
    const currentTopicKey = useMemo(() => getTopicKey(currentTopic), [currentTopic])
    const pendingQuestion = useMemo(() => session?.pending_questions?.[0] || null, [session])
    const activeQuestion = displayedQuestion || pendingQuestion
    const selectedIndex = activeQuestion ? (quizDrafts[activeQuestion.id] ?? null) : null
    const nextReady = Boolean(queuedQuestion && activeQuestion && queuedQuestion.id !== activeQuestion.id && !quizOutcomeFeedback)
    const isStartModeOverlayOpen = Boolean(roadmapRevealLabel) && session?.status === 'awaiting_start_mode'
    const pendingQuizKey = useMemo(
        () => (session?.session_id && pendingQuestion?.id ? `${session.session_id}:${pendingQuestion.id}` : null),
        [pendingQuestion?.id, session?.session_id]
    )
    const isQuizOverlayOpen = Boolean(pendingQuestion) && pendingQuizKey !== dismissedQuizKey
    const quizOverlayQuestion = outcomeAnchorQuestion ?? activeQuestion
    const showQuizOverlay = Boolean(quizOverlayQuestion && (quizOutcomeFeedback || isQuizOverlayOpen))
    const overlaySelectedIndex = quizOverlayQuestion ? (quizDrafts[quizOverlayQuestion.id] ?? null) : null
    const isFocusConfirm = session?.status === 'awaiting_focus_confirm'

    const awaitingQuizConsent = Boolean(
        (session?.state?.conversation_state as { awaiting_quiz_consent?: boolean } | undefined)?.awaiting_quiz_consent
    )
    const isDungeonActive = session?.status === 'awaiting_topic_dungeon'
    const dungeonResolved = Boolean(session?.state?.dungeon?.resolved)
    const showDungeonButton = Boolean(
        session &&
            dungeonPhase === 'hidden' &&
            !pendingQuestion &&
            !isStartModeOverlayOpen &&
            !isFocusConfirm &&
            session.status === 'awaiting_topic_followup' &&
            awaitingQuizConsent
    )
    const showQuizReadyButton = Boolean(
        session &&
            dungeonPhase === 'hidden' &&
            !pendingQuestion &&
            !isStartModeOverlayOpen &&
            !isFocusConfirm &&
            !isDungeonActive &&
            ((session.status === 'awaiting_topic_followup' && awaitingQuizConsent) || session.status === 'reviewing_domain')
    )
    const quizReadyButtonLabel =
        session?.status === 'reviewing_domain' ? 'Start module quiz' : 'Start task quiz'

    const placeholder = useMemo(
        () => chat2InputPlaceholder(session, Boolean(pendingQuestion)),
        [session, pendingQuestion]
    )

    const chatScrollStorageKeyForDungeon = useMemo(
        () => getChatScrollStorageKey({ userId: userId || undefined, sessionId: session?.session_id, projectId: selectedProjectId }),
        [userId, session?.session_id, selectedProjectId]
    )

    useLayoutEffect(() => {
        if (dungeonPhase !== 'hidden') return
        if (!snapLectureAfterDungeonExitRef.current) return
        snapLectureAfterDungeonExitRef.current = false
        if (!scrollContainerRef) return
        snapLectureThreadToBottom(scrollContainerRef, chatScrollStorageKeyForDungeon)
    }, [dungeonPhase, messages.length, chatScrollStorageKeyForDungeon, scrollContainerRef])

    useEffect(() => {
        if (!userId) return
        const fetchProfile = async () => {
            const supabase = createClient()
            if (!supabase) return
            const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
            setProfile(data)
        }
        void fetchProfile()
    }, [userId])

    useEffect(() => {
        queuedQuestionRef.current = queuedQuestion
    }, [queuedQuestion])

    useEffect(() => {
        if (!pendingQuestion) {
            setDisplayedQuestion(null)
            setQueuedQuestion(null)
            setQuizSubmitting(false)
            return
        }
        if (!displayedQuestion) {
            setDisplayedQuestion(pendingQuestion)
            return
        }
        if (displayedQuestion.id === pendingQuestion.id) return
        setQueuedQuestion(pendingQuestion)
    }, [displayedQuestion, pendingQuestion, queuedQuestion])

    useEffect(() => {
        if (!pendingQuizKey) {
            setDismissedQuizKey(null)
            return
        }
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
        if (session.status === 'awaiting_focus_confirm') return
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
        const sync = async () => {
            const { data, error: requestError } = await getAgentSession(session.session_id)
            if (cancelled || requestError || !data) return
            const hydrated = hydrateSession(data)
            if (!hydrated.pending_questions.length && !hydrated.state?.active_quiz_id) return
            setSession(hydrated)
        }
        void sync()
        return () => {
            cancelled = true
        }
    }, [pendingQuestion, session])

    useEffect(() => {
        if (!session) return
        if (session.status !== 'awaiting_focus_confirm') return
        const focus = session.state?.focus_reveal as Record<string, unknown> | undefined
        if (!focus) return
        shouldRevealNextTaskRef.current = false
        setTaskReveal({
            topicTitle: String(focus.topic_title || 'Next learning focus'),
            skillTitle: String(focus.skill_title || 'Current skill'),
            domainTitle: focus.domain_title ? String(focus.domain_title) : null,
        })
    }, [session])

    const refreshProjects = useCallback(
        async (preferredProjectId?: string) => {
            if (!userId) return []
            const { data, error: requestError } = await listAgentProjects(userId)
            if (requestError || !data) {
                setError(requestError || 'Failed to load projects')
                return []
            }
            setProjects(data)
            if (preferredProjectId) setSelectedProjectId(preferredProjectId)
            return data
        },
        [userId]
    )

    const loadProject = useCallback(
        async (projectId: string) => {
            if (!userId) return
            setBusy(true)
            setError(null)
            setSelectedProjectId(projectId)
            setQuizOutcomeFeedback(null)
            const { data: projectData, error: projectError } = await getProjectLatestSession(projectId, userId)
            if (projectError || !projectData) {
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
            const { data: eventData, error: eventError } = await listAgentSessionEvents(latestSession.session_id, userId)
            if (eventError || !eventData) {
                setError(eventError || 'Failed to load session transcript')
                setBusy(false)
                return
            }
            const hydratedSession = hydrateSession(latestSession)
            setSession(hydratedSession)
            setMessages(eventData.map(eventToTimelineMessage).filter((m): m is Chat2TimelineMessage => Boolean(m)))
            if (hydratedSession.status === 'awaiting_topic_dungeon') {
                const d = hydratedSession.state.dungeon
                setDungeonMessages(dungeonBufferToMessages(d?.buffer))
                const o = d?.outcome === 'success' ? 'success' : d?.outcome === 'failure' ? 'failure' : null
                setDungeonOutcome(o)
                setDungeonPhase(d?.resolved ? 'outcome' : 'active')
                setDungeonInput('')
            } else {
                setDungeonPhase('hidden')
                setDungeonMessages([])
                setDungeonOutcome(null)
                setDungeonInput('')
            }
            setRoadmapRevealLabel(
                hydratedSession.status === 'awaiting_start_mode'
                    ? toRoadmapLabel(
                          hydratedSession.roadmap?.normalized_title || hydratedSession.roadmap?.query || projectData.project.goal
                      )
                    : null
            )
            lastSeenTopicKeyRef.current = getTopicKey(getCurrentTopic(hydratedSession))
            shouldRevealNextTaskRef.current = false
            setBusy(false)
            setDrawerOpen(false)
        },
        [userId]
    )

    const streamAssistantMessage = useCallback((content: string, onComplete?: () => void | Promise<void>) => {
        if (streamingTimerRef.current) window.clearInterval(streamingTimerRef.current)
        const messageId = `assistant-${Date.now()}`
        const createdAt = new Date().toISOString()
        setMessages(prev => [...prev, { id: messageId, role: 'assistant' as const, content: '', createdAt }])
        let index = 0
        const reveal = () => {
            index = Math.min(index + 6, content.length)
            setMessages(prev =>
                prev.map(m =>
                    m.id === messageId ? { ...m, content: content.slice(0, index) } : m
                )
            )
            if (index >= content.length) {
                if (streamingTimerRef.current) {
                    window.clearInterval(streamingTimerRef.current)
                    streamingTimerRef.current = null
                }
                void Promise.resolve(onComplete?.())
            }
        }
        streamingTimerRef.current = window.setInterval(reveal, 18)
    }, [])

    const streamDungeonAssistantMessage = useCallback((content: string, onComplete?: () => void | Promise<void>) => {
        if (dungeonStreamTimerRef.current) window.clearInterval(dungeonStreamTimerRef.current)
        const messageId = `dungeon-asst-${Date.now()}`
        const createdAt = new Date().toISOString()
        setDungeonMessages(prev => [...prev, { id: messageId, role: 'assistant', content: '', createdAt }])
        let index = 0
        const reveal = () => {
            index = Math.min(index + 6, content.length)
            setDungeonMessages(prev =>
                prev.map(m =>
                    m.id === messageId ? { ...m, content: content.slice(0, index) } : m
                )
            )
            if (index >= content.length) {
                if (dungeonStreamTimerRef.current) {
                    window.clearInterval(dungeonStreamTimerRef.current)
                    dungeonStreamTimerRef.current = null
                }
                void Promise.resolve(onComplete?.())
            }
        }
        dungeonStreamTimerRef.current = window.setInterval(reveal, 18)
    }, [])

    const continueSession = useCallback(
        async (payload: AgentTurnPayload, postStream?: (response: AgentSessionResponse) => void) => {
            if (!session || !userId) return null
            setBusy(true)
            setError(null)
            shouldRevealNextTaskRef.current = true
            const { data, error: requestError } = await sendAgentMessage(session.session_id, payload)
            if (requestError || !data) {
                setError(requestError || 'Failed to send message')
                setBusy(false)
                return null
            }
            const { data: syncedSession } = await getAgentSession(data.session_id)
            const nextSession = syncedSession ? hydrateSession(syncedSession) : data
            setSession(nextSession)
            setSelectedProjectId(prev => data.project_id || prev)

            const streamToDungeon = nextSession.status === 'awaiting_topic_dungeon' && payload.input_mode !== 'dungeon_dismiss'
            const shouldStream =
                shouldAppendAssistantTimelineMessage(data) && Boolean((typeof data.message === 'string' ? data.message : '').trim())

            const finishTurn = async () => {
                await refreshProjects(data.project_id || selectedProjectId || undefined)
                setBusy(false)
                setProfile(prev => {
                    if (!prev) return prev
                    const newXP = prev.xp + 10
                    void (async () => {
                        const supabase = createClient()
                        if (supabase) await supabase.from('profiles').update({ xp: newXP }).eq('id', userId)
                    })()
                    return { ...prev, xp: newXP }
                })
                postStream?.(data)
            }

            if (shouldStream) {
                const text = typeof data.message === 'string' ? data.message : String(data.message ?? '')
                if (streamToDungeon) {
                    streamDungeonAssistantMessage(text, finishTurn)
                } else {
                    streamAssistantMessage(text, finishTurn)
                }
            } else {
                void finishTurn()
            }
            return data
        },
        [session, userId, refreshProjects, streamAssistantMessage, streamDungeonAssistantMessage, selectedProjectId]
    )

    const startSession = useCallback(
        async (query: string) => {
            if (!userId) {
                setError('You need to be logged in.')
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
                const learningStyle = sessionStorage.getItem('learning_style')
                if (learningStyle) sessionStorage.removeItem('learning_style')
                const { data, error: requestError } = await createAgentSession(userId, query, learningStyle)
                if (requestError || !data) {
                    setError(requestError || 'Failed to create session')
                    setBusy(false)
                    setIsRoadmapLoading(false)
                    return
                }
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
        },
        [userId, refreshProjects]
    )

    useEffect(() => {
        if (!userId || hasInitialized || initializationStartedRef.current) return
        initializationStartedRef.current = true
        const init = async () => {
            try {
                const storedGoal = sessionStorage.getItem('career_goal')
                const loadedProjects = await refreshProjects()
                if (storedGoal) {
                    sessionStorage.removeItem('career_goal')
                    setMessages([
                        {
                            id: `goal-${Date.now()}`,
                            role: 'user',
                            content: storedGoal,
                            createdAt: new Date().toISOString(),
                        },
                    ])
                    setHasInitialized(true)
                    await startSession(storedGoal)
                    return
                }
                if (loadedProjects.length > 0) await loadProject(loadedProjects[0].id)
                setHasInitialized(true)
            } catch {
                initializationStartedRef.current = false
            }
        }
        void init()
        // Intentionally mirror /chat: run once per user after mount (not on every callback identity change).
        // eslint-disable-next-line react-hooks/exhaustive-deps -- stable init gate
    }, [hasInitialized, userId])

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            const trimmed = input.trim()
            if (!trimmed || busy || !userId) return
            setInput('')
            if (!session) {
                await startSession(trimmed)
                return
            }
            if (session.status === 'awaiting_topic_dungeon' && !session.state.dungeon?.resolved) {
                return
            }
            setMessages(prev => [
                ...prev,
                {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: trimmed,
                    createdAt: new Date().toISOString(),
                    variant: 'standard',
                },
            ])
            await continueSession({ user_id: userId, message: trimmed, input_mode: 'text' })
        },
        [input, busy, userId, session, startSession, continueSession]
    )

    const handleDungeonSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            const trimmed = dungeonInput.trim()
            if (!trimmed || busy || !userId || !session) return
            if (session.state.dungeon?.resolved) return
            setDungeonInput('')
            setDungeonMessages(prev => [
                ...prev,
                { id: `dungeon-user-${Date.now()}`, role: 'user', content: trimmed, createdAt: new Date().toISOString() },
            ])
            await continueSession({ user_id: userId, message: trimmed, input_mode: 'text' }, response => {
                const d = response.dungeon_turn?.decision_state
                if (d === 'success' || d === 'failure') {
                    setDungeonOutcome(d)
                    setDungeonPhase('outcome')
                }
            })
        },
        [dungeonInput, busy, userId, session, continueSession]
    )

    const handleQuizChoice = useCallback(
        (optionIndex: number) => {
            if (!activeQuestion) return
            setQuizDrafts(prev => ({ ...prev, [activeQuestion.id]: optionIndex }))
        },
        [activeQuestion]
    )

    const handleQuizSubmit = useCallback(async () => {
        if (!session || !userId || !activeQuestion || quizSubmitting || busy) return
        const idx = quizDrafts[activeQuestion.id]
        if (idx === null || idx === undefined) return
        const selectedOption = activeQuestion.options[idx]
        if (!selectedOption) return
        setQuizSubmitting(true)
        const response = await continueSession({
            user_id: userId,
            message: selectedOption.label,
            input_mode: 'multiple_choice',
            question_id: activeQuestion.id,
            selected_option_id: selectedOption.id,
            selected_option_index: idx,
        })
        setQuizSubmitting(false)
        const fb = response?.quiz_outcome_feedback ?? null
        setQuizOutcomeFeedback(fb)
        if (fb && activeQuestion) setOutcomeAnchorQuestion(activeQuestion)
        else if (!fb) setOutcomeAnchorQuestion(null)
        if (response?.pending_questions?.length) setQueuedQuestion(response.pending_questions[0])
        else setQueuedQuestion(null)
    }, [session, userId, activeQuestion, quizDrafts, quizSubmitting, busy, continueSession])

    const handleQuizFeedbackContinue = useCallback(() => {
        setQuizOutcomeFeedback(null)
        setOutcomeAnchorQuestion(null)
        const q = queuedQuestionRef.current
        if (q) {
            setDisplayedQuestion(q)
            setQueuedQuestion(null)
            setQuizDrafts(prev => ({ ...prev, [q.id]: null }))
        }
    }, [])

    const handleNextQuestion = useCallback(() => {
        if (!queuedQuestion) return
        setDisplayedQuestion(queuedQuestion)
        setQueuedQuestion(null)
        setQuizDrafts(prev => ({ ...prev, [queuedQuestion.id]: null }))
    }, [queuedQuestion])

    const handleStartModeSelection = useCallback(
        async (mode: 'beginning' | 'placement') => {
            if (!session || !userId || busy) return
            const response = await continueSession({
                user_id: userId,
                message: mode === 'beginning' ? 'Start at beginning' : 'Take placement test',
                input_mode: 'start_mode',
                selected_option_id: mode,
            })
            if (response && response.status !== 'awaiting_start_mode') setRoadmapRevealLabel(null)
        },
        [session, userId, busy, continueSession]
    )

    const handleFocusConfirm = useCallback(async () => {
        setTaskReveal(null)
        if (!session || !userId || busy) return
        await continueSession({ user_id: userId, message: 'Get started', input_mode: 'focus_confirm' })
    }, [session, userId, busy, continueSession])

    const handleQuizReadyFromButton = useCallback(async () => {
        if (!session || !userId || busy || pendingQuestion) return
        await continueSession({ user_id: userId, message: 'ready', input_mode: 'text' })
    }, [session, userId, busy, pendingQuestion, continueSession])

    const handleDungeonStart = useCallback(async () => {
        if (!session || !userId || busy || pendingQuestion) return
        setDungeonPhase('entering')
        setDungeonMessages([])
        setDungeonInput('')
        setDungeonOutcome(null)
        const res = await continueSession(
            { user_id: userId, message: undefined, input_mode: 'dungeon_start' },
            response => {
                const d = response.dungeon_turn?.decision_state
                if (d === 'success' || d === 'failure') {
                    setDungeonOutcome(d)
                    setDungeonPhase('outcome')
                } else {
                    setDungeonPhase('active')
                }
            }
        )
        if (!res) setDungeonPhase('hidden')
    }, [session, userId, busy, pendingQuestion, continueSession])

    const handleDungeonAbort = useCallback(async () => {
        if (!session || !userId || busy) return
        await continueSession({ user_id: userId, message: undefined, input_mode: 'dungeon_abort' }, () => {
            snapLectureAfterDungeonExitRef.current = true
            setDungeonPhase('hidden')
            setDungeonMessages([])
            setDungeonOutcome(null)
            setDungeonInput('')
        })
    }, [session, userId, busy, continueSession])

    const handleDungeonDismissFromOutcome = useCallback(async () => {
        if (!session || !userId || busy) return
        setDungeonPhase('exiting')
        await new Promise<void>(r => {
            window.setTimeout(r, 900)
        })
        const res = await continueSession(
            { user_id: userId, message: undefined, input_mode: 'dungeon_dismiss' },
            () => {
                snapLectureAfterDungeonExitRef.current = true
                setDungeonMessages([])
                setDungeonOutcome(null)
                setDungeonInput('')
                setDungeonPhase('hidden')
            }
        )
        if (!res) setDungeonPhase('outcome')
    }, [session, userId, busy, continueSession])

    const dismissQuizOverlay = useCallback(() => {
        if (busy || quizSubmitting) return
        setQuizOutcomeFeedback(null)
        setOutcomeAnchorQuestion(null)
        if (pendingQuizKey) setDismissedQuizKey(pendingQuizKey)
    }, [pendingQuizKey, busy, quizSubmitting])

    const reopenQuizOverlay = useCallback(() => setDismissedQuizKey(null), [])

    const beginNewProject = useCallback(() => {
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
        setDrawerOpen(false)
        setQuizOutcomeFeedback(null)
        setDungeonPhase('hidden')
        setDungeonMessages([])
        setDungeonInput('')
        setDungeonOutcome(null)
    }, [])

    const handleDeleteProject = useCallback(
        async (projectId: string) => {
            if (!userId || busy) return
            const target = projects.find(p => p.id === projectId)
            if (!window.confirm(`Delete "${target?.title || 'this project'}"? This cannot be undone.`)) return
            setBusy(true)
            setError(null)
            const { error: requestError } = await deleteAgentProject(projectId, userId)
            if (requestError) {
                setError(requestError || 'Failed to delete project')
                setBusy(false)
                return
            }
            const remaining = await refreshProjects()
            if (selectedProjectId === projectId) {
                if (remaining.length > 0) await loadProject(remaining[0].id)
                else {
                    setSelectedProjectId(null)
                    setSession(null)
                    setMessages([])
                    setBusy(false)
                }
                return
            }
            setBusy(false)
        },
        [userId, busy, projects, selectedProjectId, refreshProjects, loadProject]
    )

    return {
        profile,
        projects,
        selectedProjectId,
        session,
        messages,
        input,
        setInput,
        busy,
        error,
        setError,
        hasInitialized,
        roadmapCreationQuery,
        isRoadmapLoading,
        roadmapRevealLabel,
        taskReveal,
        setTaskReveal,
        quizSubmitting,
        activeQuestion,
        selectedIndex,
        nextReady,
        isStartModeOverlayOpen,
        isQuizOverlayOpen,
        showQuizOverlay,
        quizOverlayQuestion,
        overlaySelectedIndex,
        isFocusConfirm,
        pendingQuestion,
        showQuizReadyButton,
        showDungeonButton,
        isDungeonActive,
        dungeonResolved,
        dungeonPhase,
        dungeonMessages,
        dungeonInput,
        setDungeonInput,
        dungeonOutcome,
        handleDungeonSubmit,
        handleDungeonDismissFromOutcome,
        quizReadyButtonLabel,
        placeholder,
        drawerOpen,
        setDrawerOpen,
        dashboardStubOpen,
        setDashboardStubOpen,
        currentDomain,
        currentSkill,
        currentTopic,
        refreshProjects,
        loadProject,
        handleSubmit,
        handleQuizChoice,
        handleQuizSubmit,
        handleQuizFeedbackContinue,
        quizOutcomeFeedback,
        handleNextQuestion,
        handleStartModeSelection,
        handleFocusConfirm,
        handleQuizReadyFromButton,
        handleDungeonStart,
        handleDungeonAbort,
        dismissQuizOverlay,
        reopenQuizOverlay,
        beginNewProject,
        handleDeleteProject,
    }
}
