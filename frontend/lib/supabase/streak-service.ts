import { createClient } from './server';

/**
 * Checks and updates the user's daily streak
 */
export async function updateStreak(userId: string) {
    const supabase = await createClient();

    // Get current profile
    const { data: profile, error: getError } = await supabase
        .from('profiles')
        .select('streak_days, last_active_at')
        .eq('id', userId)
        .single() as any; // last_active_at might not be in schema yet, we'll check

    if (getError) throw getError;

    const now = new Date();
    const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : null;

    let newStreak = profile.streak_days || 0;

    if (!lastActive) {
        newStreak = 1;
    } else {
        const hoursSinceLastActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastActive < 24 && now.getDate() !== lastActive.getDate()) {
            // New day, increment streak
            newStreak += 1;
        } else if (hoursSinceLastActive >= 48) {
            // Streak broken
            newStreak = 1;
        }
        // If same day, keep streak as is
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
            streak_days: newStreak,
            last_active_at: now.toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) {
        // If last_active_at doesn't exist, we should probably add it to the DB
        // For now, just update streak_days if that's what we have
        const { error: retryError } = await supabase
            .from('profiles')
            .update({ streak_days: newStreak })
            .eq('id', userId);

        if (retryError) throw retryError;
    }

    return newStreak;
}
