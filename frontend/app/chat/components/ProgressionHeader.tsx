import { ActionXP, getXPForLevel } from '@/lib/supabase/progression-service';

interface ProgressionHeaderProps {
    level: number;
    xp: number;
}

export function ProgressionHeader({ level, xp }: ProgressionHeaderProps) {
    const currentLevelXP = getXPForLevel(level);
    const nextLevelXP = getXPForLevel(level + 1);
    const xpInLevel = xp - currentLevelXP;
    const xpNeededForNext = nextLevelXP - currentLevelXP;
    const progressPercent = Math.min(Math.round((xpInLevel / xpNeededForNext) * 100), 100);

    return (
        <div className="flex flex-col space-y-1.5 w-32 sm:w-48">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                <span>Level {level}</span>
                <span>{xpInLevel}/{xpNeededForNext} XP</span>
            </div>
            <div className="h-2 w-full bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/20 dark:border-white/10">
                <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 smooth-transition shadow-glow"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
