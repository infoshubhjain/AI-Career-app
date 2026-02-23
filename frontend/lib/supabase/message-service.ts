import { createClient } from './server';

export interface ChatMessage {
    roadmap_id: string;
    user_id: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: any;
}

export async function saveMessage(message: ChatMessage) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();

    if (error) {
        console.error('Error saving message:', error);
        throw error;
    }

    return data;
}

export async function getMessagesByRoadmap(roadmapId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('roadmap_id', roadmapId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return data;
}
