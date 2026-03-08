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
    kind: 'profile' | 'knowledge_probe' | 'topic_quiz' | 'skill_quiz' | 'domain_quiz'
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
    timestamp?: string | null
    filename?: string | null
    existing?: boolean | null
}

export interface AgentSessionState {
    profile_answers?: string[]
    knowledge_state?: {
        skills?: Record<string, unknown>
        learning_frontier?: Record<string, unknown> | null
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
    [key: string]: unknown
}

export interface AgentSessionResponse {
    session_id: string
    user_id: string
    status: string
    active_agent: string
    message: string
    roadmap?: AgentRoadmap | null
    pending_questions: AgentQuestion[]
    state: AgentSessionState
}

export interface AgentSessionStateResponse {
    session_id: string
    user_id: string
    status: string
    active_agent: string
    roadmap?: AgentRoadmap | null
    state: AgentSessionState
}
