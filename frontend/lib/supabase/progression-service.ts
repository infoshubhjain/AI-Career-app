import { createClient } from './server';

// Constants for XP calculation
const XP_PER_MESSAGE = 10;
const XP_PER_CHALLENGE = 50;
const XP_LEVEL_BASE = 100; // XP needed for Level 2
const XP_SCALING_FACTOR = 1.1; // Each level needs 10% more XP

/**
 * Calculates the total XP required to reach a specific level
 */
export function getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    let totalXP = 0;
    for (let i = 1; i < level; i++) {
        totalXP += Math.floor(XP_LEVEL_BASE * Math.pow(XP_SCALING_FACTOR, i - 1));
    }
    return totalXP;
}

/**
 * Calculates the current level based on total XP
 */
export function getLevelFromXP(xp: number): number {
    let level = 1;
    while (getXPForLevel(level + 1) <= xp) {
        level++;
    }
    return level;
}

/**
 * Updates user XP and level in profiles
 */
export async function updateUserProgression(userId: string, xpGain: number) {
    const supabase = await createClient();

    // Get current profile
    const { data: profile, error: getError } = await supabase
        .from('profiles')
        .select('xp, current_level')
        .eq('id', userId)
        .single();

    if (getError) throw getError;

    const newXP = (profile.xp || 0) + xpGain;
    const newLevel = getLevelFromXP(newXP);
    const leveledUp = newLevel > (profile.current_level || 1);

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
            xp: newXP,
            current_level: newLevel
        })
        .eq('id', userId)
        .select()
        .single();

    if (updateError) throw updateError;

    return {
        profile: updatedProfile,
        leveledUp,
        xpGain
    };
}

export const ActionXP = {
    MESSAGE_SENT: XP_PER_MESSAGE,
    CHALLENGE_COMPLETED: XP_PER_CHALLENGE,
};
