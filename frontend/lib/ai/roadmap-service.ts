'use server'

import { createClient } from '@/lib/supabase/server';
import { generateObject } from 'ai';
import { googleAI } from './ai-client';
import { roadmapPrompt } from './prompts';

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

    // Generate the full roadmap using AI
    const { object: roadmap } = await generateObject({
        model: googleAI,
        prompt: roadmapPrompt(goal, level),
        output: 'no-schema' as any, // We specify schema in the prompt
    });

    const typedRoadmap = (roadmap as unknown) as RoadmapData;

    // Insert into Supabase
    const { data, error } = await supabase
        .from('roadmaps')
        .insert({
            user_id: userId,
            goal: goal,
            full_roadmap: typedRoadmap,
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
