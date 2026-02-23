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
