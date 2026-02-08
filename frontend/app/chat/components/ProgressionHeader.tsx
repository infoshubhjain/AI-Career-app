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
        <div className="flex flex-col space-y-1 w-32 sm:w-48">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <span>Level {level}</span>
                <span>{xpInLevel}/{xpNeededForNext} XP</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-neutral-900 dark:bg-white transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
