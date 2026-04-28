export interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    metadata?: any
    created_at: string
}

export interface Roadmap {
    id: string
    user_id: string
    goal: string
    full_roadmap: RoadmapStep[]
    current_step: number
    status: 'active' | 'completed' | 'archived'
    created_at: string
}

export interface RoadmapStep {
    id: number
    title: string
    description: string
    skills: string[]
    completed: boolean
}

export interface UserProfile {
    id: string
    display_name: string
    avatar_url: string
    xp: number
    streak_days: number
    current_level: number
    created_at: string
}

export interface AgentQuestion {
    id: string
    prompt: string
    skill_id?: string | null
    domain_id?: string | null
    concept_id?: string | null
    correct_option_index?: number | null
    question_type: 'multiple_choice'
    kind: 'profile' | 'knowledge_probe' | 'placement_probe' | 'placement_confirm' | 'topic_quiz' | 'skill_quiz' | 'domain_quiz'
    options: AgentAnswerOption[]
    attempt_number: number
    difficulty?: 'easy' | 'medium' | 'hard' | null
    placement_stage?: 'placement_probe' | 'placement_confirm' | null
    quiz_id?: string | null
}

export interface AgentAnswerOption {
    id: string
    label: string
}

/** Returned after lesson quiz submits; show in overlay only, not duplicated in chat. */
export interface QuizOutcomeFeedback {
    is_correct: boolean
    explanation_markdown: string
}

export interface DungeonTurnPayload {
    narration: string
    decision_state: 'continue' | 'success' | 'failure'
    success_condition?: string | null
    failure_condition?: string | null
    scenario_title?: string | null
    stakes_tier?: number | null
}

export interface AgentRoadmapSkill {
    id: string
    title: string
    description: string
    order: number
}

export interface AgentRoadmapDomain {
    id: string
    title: string
    description: string
    order: number
    subdomains?: AgentRoadmapSkill[]
}

export interface AgentRoadmap {
    query: string
    domains: AgentRoadmapDomain[]
    normalized_title?: string | null
    timestamp?: string | null
    filename?: string | null
    existing?: boolean | null
}

export interface AgentSessionState {
    profile_answers?: Array<Record<string, unknown>>
    learner_profile?: {
        reading_level?: string | null
    }
    knowledge_state?: {
        skills?: Record<string, unknown>
        learning_frontier?: Record<string, unknown> | null
        current_probe?: Record<string, unknown> | null
        skill_probabilities_summary?: Array<Record<string, unknown>>
        selection_reason?: string | null
    }
    placement_state?: {
        phase?: string
        question_budget_used?: number
        max_questions?: number
        recent_question_fingerprints?: string[]
        global_history?: Array<Record<string, unknown>>
        last_selected_skill_id?: string | null
        last_selected_score?: number | null
        frontier_index?: number | null
        selection_policy?: string | null
        skill_probability_summary?: Array<Record<string, unknown>>
        stop_reason?: string | null
    }
    conversation_state?: Record<string, unknown>
    roadmap_progress?: {
        domain_index: number
        skill_index: number
    }
    lesson_plan?: Array<Record<string, unknown>>
    current_topic_index?: number
    memory_summary?: string
    completed_domains?: string[]
    pending_domain_review?: Record<string, unknown> | null
    active_quiz_id?: string | null
    active_quiz_kind?: string | null
    /** Server-owned dungeon run (buffer memory, resolved flag). */
    dungeon?: {
        active?: boolean
        resolved?: boolean
        outcome?: 'success' | 'failure' | string
        buffer?: Array<{ role?: string; text?: string; decision_state?: string }>
        scenario_title?: string | null
    }
    [key: string]: unknown
}

export interface AgentSessionResponse {
    session_id: string
    project_id?: string | null
    user_id: string
    status: string
    active_agent: string
    message: string
    roadmap?: AgentRoadmap | null
    pending_questions: AgentQuestion[]
    state: AgentSessionState
    quiz_outcome_feedback?: QuizOutcomeFeedback | null
    dungeon_turn?: DungeonTurnPayload | null
}

export interface AgentSessionStateResponse {
    session_id: string
    project_id?: string | null
    user_id: string
    status: string
    active_agent: string
    roadmap?: AgentRoadmap | null
    pending_questions: AgentQuestion[]
    state: AgentSessionState
}

export interface AgentProjectSummary {
    id: string
    user_id: string
    title: string
    goal: string
    status: string
    latest_session_id?: string | null
    latest_session_status?: string | null
    created_at: string
    updated_at: string
}

export interface AgentProjectLatestSessionResponse {
    project: AgentProjectSummary
    session: AgentSessionStateResponse | null
}

export interface AgentEvent {
    id: number
    session_id: string
    role: 'user' | 'assistant' | 'system'
    agent: string
    event_type: string
    content?: string | null
    payload: Record<string, unknown>
    created_at: string
}

export interface AgentDeleteResponse {
    deleted: boolean
}
