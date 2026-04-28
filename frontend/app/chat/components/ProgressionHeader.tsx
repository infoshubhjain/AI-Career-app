import { getXPForLevel } from '@/lib/progression';

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
        <div className="flex w-36 flex-col space-y-1.5 sm:w-48">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                <span>Level {level}</span>
                <span>{xpInLevel}/{xpNeededForNext} XP</span>
            </div>
            <div className="h-2 w-full rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)]">
                <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
