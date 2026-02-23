'use server'

import { createClient } from '@/lib/supabase/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Define the backend response structure here since it's not exported from page.tsx suitably
export interface BackendSubdomain {
    id: string;
    domain_id: string;
    title: string;
    description: string;
    order: number;
}

export interface BackendDomain {
    id: string;
    title: string;
    description: string;
    order: number;
    subdomains?: BackendSubdomain[];
}

export interface BackendRoadmapResponse {
    query: string;
    domains: BackendDomain[];
}

export interface RoadmapStep {
    id: number;
    title: string;
    description: string;
}

export interface RoadmapPhase {
    title: string;
    steps: RoadmapStep[];
}

export interface RoadmapData {
    goal: string;
    total_steps: number;
    phases: RoadmapPhase[];
}

export async function generateAndSaveRoadmap(userId: string, goal: string, level: string) {
    const supabase = await createClient();

    // Call the backend Roadmap Agent API
    const query = `${goal}. My current level is: ${level}`;

    // We fetch directly because this is a server action, not a client component
    const response = await fetch(`${API_URL}/api/roadmap/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        let errorMsg = 'Failed to generate roadmap from backend';
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorData.message || errorMsg;
        } catch (e) {
            // ignore
        }
        console.error('Backend roadmap generation error:', errorMsg);
        throw new Error(errorMsg);
    }

    const roadmapResponse: BackendRoadmapResponse = await response.json();

    // Map the backend structure (domains/subdomains) to the frontend structure (phases/steps)
    let totalSteps = 0;
    let globalStepId = 1;

    const phases: RoadmapPhase[] = roadmapResponse.domains.map((domain: BackendDomain) => {
        const steps: RoadmapStep[] = [];
        const sortedSubdomains = domain.subdomains ? [...domain.subdomains].sort((a, b) => a.order - b.order) : [];

        sortedSubdomains.forEach(sub => {
            steps.push({
                id: globalStepId++,
                title: sub.title,
                description: sub.description
            });
            totalSteps++;
        });

        return {
            title: domain.title,
            steps
        };
    });

    const mappedRoadmapData: RoadmapData = {
        goal: roadmapResponse.query,
        total_steps: totalSteps,
        phases: phases
    };

    // Insert into Supabase
    const { data, error } = await supabase
        .from('roadmaps')
        .insert({
            user_id: userId,
            goal: goal,
            full_roadmap: mappedRoadmapData as any,
            current_step: 1, // Start at step 1
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving roadmap:', error);
        throw error;
    }

    return data;
}

export async function getActiveRoadmap(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching roadmap:', error);
    }

    return data;
}

export async function updateRoadmapProgress(roadmapId: string, nextStep: number) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('roadmaps')
        .update({ current_step: nextStep })
        .eq('id', roadmapId);

    if (error) {
        console.error('Error updating roadmap progress:', error);
        throw error;
    }
}
