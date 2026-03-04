'use server'

import { createClient } from '@/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';

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

export interface BackendRoadmapGenerateResponse {
    roadmap: BackendRoadmapResponse;
    existing: boolean;
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

export async function generateAndSaveRoadmap(userId: string, goal: string, level: string, context?: string) {
    const supabase = await createClient();

    // Try the backend API first
    let query = `${goal}. My current level is: ${level}`;
    if (context) {
        query += `. Additional context: ${context}`;
    }

    try {
        // We fetch directly because this is a server action, not a client component
        const response = await fetch(`${API_URL}/api/roadmap/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        if (response.ok) {
            const payload: BackendRoadmapGenerateResponse | BackendRoadmapResponse = await response.json();
            const roadmapResponse: BackendRoadmapResponse =
                "roadmap" in payload ? payload.roadmap : payload;
            
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
    } catch (error) {
        console.error('Backend roadmap generation failed, using mock data:', error);
    }

    // Fallback to mock roadmap if backend fails
    console.log('Using mock roadmap generation for:', goal);
    
    const mockRoadmapData: RoadmapData = {
        goal: goal,
        total_steps: 12,
        phases: [
            {
                title: "Foundation Building",
                steps: [
                    { id: 1, title: "Learn HTML & CSS Basics", description: "Master the fundamental building blocks of web pages" },
                    { id: 2, title: "JavaScript Fundamentals", description: "Understand variables, functions, and basic programming concepts" },
                    { id: 3, title: "Version Control with Git", description: "Learn to track changes and collaborate with others" },
                    { id: 4, title: "Responsive Design", description: "Create websites that work on all devices" }
                ]
            },
            {
                title: "Frontend Frameworks",
                steps: [
                    { id: 5, title: "React Fundamentals", description: "Learn components, state, and props in React" },
                    { id: 6, title: "State Management", description: "Master Redux or Context API for complex applications" },
                    { id: 7, title: "React Router", description: "Handle navigation and routing in single-page applications" },
                    { id: 8, title: "Styling with Tailwind CSS", description: "Modern utility-first CSS framework" }
                ]
            },
            {
                title: "Advanced Topics & Deployment",
                steps: [
                    { id: 9, title: "API Integration", description: "Connect frontend to backend services" },
                    { id: 10, title: "Testing & Debugging", description: "Write tests and debug applications effectively" },
                    { id: 11, title: "Performance Optimization", description: "Optimize applications for speed and user experience" },
                    { id: 12, title: "Deployment & DevOps", description: "Deploy applications to production environments" }
                ]
            }
        ]
    };

    // Insert mock roadmap into Supabase
    const { data, error } = await supabase
        .from('roadmaps')
        .insert({
            user_id: userId,
            goal: goal,
            full_roadmap: mockRoadmapData as any,
            current_step: 1,
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving mock roadmap:', error);
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
