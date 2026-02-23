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
        <div className="fixed inset-y-0 right-0 w-80 glass-premium-dark dark:glass-premium-dark border-l border-white/20 dark:border-white/10 shadow-2xl z-50 p-6 flex flex-col space-y-8 animate-in slide-in-from-right duration-300 backdrop-blur-xl">
            <button
                onClick={onClose}
                className="self-end p-2.5 hover:bg-white/10 dark:hover:bg-neutral-800/50 rounded-full smooth-transition"
                aria-label="Close dashboard"
            >
                <Trophy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>

            <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="w-12 h-12 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">{profile?.display_name || 'Career Explorer'}</h2>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">Level {profile?.current_level || 1} Apprentice</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl border border-orange-500/20 text-center backdrop-blur-sm">
                    <Flame className="w-7 h-7 mx-auto mb-3 text-orange-500" />
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{profile?.streak_days || 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-semibold">Day Streak</p>
                </div>
                <div className="p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/20 text-center backdrop-blur-sm">
                    <Target className="w-7 h-7 mx-auto mb-3 text-blue-500" />
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{profile?.xp || 0}</p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-600 dark:text-neutral-400 font-semibold">Total XP</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Recent Achievements</h3>
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-neutral-900/50 border border-white/20 dark:border-white/10 rounded-xl backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Coming Soon</p>
                                <p className="text-[10px] text-neutral-600 dark:text-neutral-400">Keep learning to unlock</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
