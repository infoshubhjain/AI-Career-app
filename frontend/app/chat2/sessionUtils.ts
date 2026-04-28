import type {
    AgentEvent,
    AgentRoadmapDomain,
    AgentRoadmapSkill,
    AgentSessionResponse,
    AgentSessionStateResponse,
} from '@/types'

export type Chat2TimelineMessage = {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt: string
    variant?: 'ambition' | 'standard'
}

export function getCurrentDomain(session: AgentSessionResponse | null): AgentRoadmapDomain | null {
    const domains = session?.roadmap?.domains || []
    const domainIndex = session?.state?.roadmap_progress?.domain_index ?? 0
    return domains[domainIndex] || null
}

export function getCurrentSkill(session: AgentSessionResponse | null): AgentRoadmapSkill | null {
    const domain = getCurrentDomain(session)
    const skillIndex = session?.state?.roadmap_progress?.skill_index ?? 0
    return domain?.subdomains?.[skillIndex] || null
}

export function getCurrentTopic(session: AgentSessionResponse | null): Record<string, unknown> | null {
    const lessonPlan = session?.state?.lesson_plan || []
    const topicIndex = session?.state?.current_topic_index ?? 0
    return lessonPlan[topicIndex] || null
}

export function toRoadmapLabel(value: string | null | undefined) {
    const source = (value || '').trim()
    if (!source) return 'Untitled Roadmap'
    return source
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(part => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(' ')
}

export function getTopicKey(topic: Record<string, unknown> | null) {
    const raw = topic?.id || topic?.title || topic?.objective
    return typeof raw === 'string' ? raw : null
}

export function isInitialCalibrationStatus(status: string | null | undefined) {
    return (
        status === 'awaiting_start_mode' ||
        status === 'awaiting_profile' ||
        status === 'awaiting_knowledge_answer' ||
        status === 'awaiting_focus_confirm'
    )
}

export function shouldAppendAssistantTimelineMessage(response: AgentSessionResponse) {
    if (isInitialCalibrationStatus(response.status)) return false
    const msg = typeof response.message === 'string' ? response.message.trim() : ''
    return msg.length > 0
}

export function chat2InputPlaceholder(session: AgentSessionResponse | null, hasPendingQuiz: boolean) {
    if (!session) return 'Describe your career goal…'
    if (hasPendingQuiz) return 'Answer the quiz in the modal first…'
    if (session.status === 'awaiting_start_mode') return 'Choose how to begin in the dialog…'
    if (session.status === 'awaiting_topic_followup') return 'Ask a follow-up, or use Start quiz below…'
    if (session.status === 'awaiting_topic_dungeon') return 'What do you do?'
    if (session.status.includes('quiz')) return 'Use the quiz modal to answer…'
    return 'Message your tutor…'
}

export function eventToTimelineMessage(event: AgentEvent): Chat2TimelineMessage | null {
    const responseStatus = typeof event.payload?.status === 'string' ? event.payload.status : null
    if (event.role === 'assistant' && isInitialCalibrationStatus(responseStatus)) return null
    if (event.event_type === 'initial_query') return null
    if (event.role === 'user' && event.payload?.input_mode === 'start_mode') return null
    if (event.role === 'user' && event.payload?.input_mode === 'multiple_choice') return null
    if (event.role === 'user' && event.payload?.input_mode === 'focus_confirm') return null
    if (event.role === 'user' && event.payload?.input_mode === 'quiz_ready') return null
    if (event.role === 'user' && event.payload?.input_mode === 'dungeon_start') return null
    if (event.role === 'user' && event.payload?.input_mode === 'dungeon_abort') return null
    if (event.role === 'user' && event.payload?.input_mode === 'dungeon_dismiss') return null
    if (event.payload?.dungeon_transcript === true) return null

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

export function hydrateSession(stateResponse: AgentSessionStateResponse): AgentSessionResponse {
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

export function expectsQuizOverlay(nextSession: AgentSessionResponse | null) {
    if (!nextSession) return false
    if (Boolean(nextSession.pending_questions?.length)) return true
    if (nextSession.status === 'awaiting_profile') return true
    if (nextSession.status.includes('quiz')) return true
    return Boolean(nextSession.state?.active_quiz_id)
}
