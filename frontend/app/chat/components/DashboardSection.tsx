import { UserProfile } from '@/types';
import { Trophy, Flame, Target, Star } from 'lucide-react';

interface DashboardSectionProps {
    profile: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

export function DashboardSection({ profile, isOpen, onClose }: DashboardSectionProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 flex flex-col space-y-8 animate-in slide-in-from-right duration-300">
            <button
                onClick={onClose}
                className="self-end p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
                <Trophy className="w-5 h-5 text-neutral-400" />
            </button>

            <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <Star className="w-10 h-10 text-neutral-900 dark:text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{profile?.display_name || 'Career Explorer'}</h2>
                    <p className="text-neutral-500 text-sm">Level {profile?.current_level || 1} Apprentice</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700/50 text-center">
                    <Flame className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xl font-bold">{profile?.streak_days || 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Day Streak</p>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700/50 text-center">
                    <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xl font-bold">{profile?.xp || 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Total XP</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Recent Achievements</h3>
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Coming Soon</p>
                                <p className="text-[10px] text-neutral-500">Keep learning to unlock</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
