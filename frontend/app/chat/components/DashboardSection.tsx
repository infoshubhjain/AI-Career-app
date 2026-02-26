'use client'

import { UserProfile } from '@/types';
import { Trophy, Flame, Target, Star, Zap, BookOpen, Award, X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface DashboardSectionProps {
    profile: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

/* ─── skill categories derived from XP (mock derivation) ─── */
const SKILL_CATEGORIES = [
    { name: 'Problem Solving', icon: Zap, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500' },
    { name: 'Technical Skills', icon: Target, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500' },
    { name: 'Communication', icon: BookOpen, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500' },
    { name: 'Leadership', icon: Star, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500' },
    { name: 'Adaptability', icon: TrendingUp, color: 'from-rose-500 to-red-500', bg: 'bg-rose-500' },
];

/* ─── achievement definitions ─── */
const ACHIEVEMENTS = [
    { id: 'first_chat', title: 'First Steps', desc: 'Started your first conversation', icon: '🚀', xpThreshold: 0 },
    { id: 'quiz_taker', title: 'Quiz Taker', desc: 'Completed your first quiz', icon: '🧠', xpThreshold: 20 },
    { id: 'streak_3', title: 'On a Roll', desc: '3-day learning streak', icon: '🔥', xpThreshold: 50 },
    { id: 'roadmap_gen', title: 'Path Finder', desc: 'Generated your first roadmap', icon: '🗺️', xpThreshold: 30 },
    { id: 'level_5', title: 'Rising Star', desc: 'Reached level 5', icon: '⭐', xpThreshold: 100 },
    { id: 'xp_250', title: 'Knowledge Seeker', desc: 'Earned 250 XP', icon: '💡', xpThreshold: 250 },
    { id: 'xp_500', title: 'Expert Path', desc: 'Earned 500 XP', icon: '🎓', xpThreshold: 500 },
    { id: 'xp_1000', title: 'Mastery', desc: 'Earned 1000 XP', icon: '🏆', xpThreshold: 1000 },
];

export function DashboardSection({ profile, isOpen, onClose }: DashboardSectionProps) {
    const xp = profile?.xp || 0;
    const level = profile?.current_level || 1;

    // Derive skill levels from XP (simulated until backend tracks per-skill XP)
    const skills = useMemo(() => {
        return SKILL_CATEGORIES.map((cat, i) => {
            // Distribute XP across skills with some variance
            const base = Math.min(xp * (0.15 + (i * 0.05)), 100);
            const variance = Math.sin(i * 1.5) * 10;
            const value = Math.max(0, Math.min(Math.round(base + variance), 100));
            return { ...cat, value };
        });
    }, [xp]);

    // Determine unlocked achievements
    const achievements = useMemo(() => {
        return ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: xp >= a.xpThreshold,
        }));
    }, [xp]);

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-[340px] sm:w-[380px] bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-l border-neutral-200/50 dark:border-neutral-800 shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-neutral-200/50 dark:border-neutral-800">
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Dashboard</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full smooth-transition"
                                aria-label="Close dashboard"
                            >
                                <X className="w-4 h-4 text-neutral-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Profile Card */}
                            <div className="text-center space-y-3">
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    className="relative w-20 h-20 mx-auto"
                                >
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                        <Star className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                        Lv.{level}
                                    </div>
                                </motion.div>
                                <div>
                                    <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                        {profile?.display_name || 'Career Explorer'}
                                    </h3>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                        {level < 3 ? 'Apprentice' : level < 6 ? 'Journeyman' : level < 10 ? 'Expert' : 'Master'}
                                    </p>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/15 text-center">
                                    <Flame className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                                    <p className="text-xl font-bold text-neutral-900 dark:text-white">{profile?.streak_days || 0}</p>
                                    <p className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">Day Streak</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 text-center">
                                    <Target className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                                    <p className="text-xl font-bold text-neutral-900 dark:text-white">{xp}</p>
                                    <p className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">Total XP</p>
                                </div>
                            </div>

                            {/* Skill Progress Bars */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                                    <TrendingUp className="w-3 h-3" />
                                    Skill Breakdown
                                </h3>
                                <div className="space-y-2.5">
                                    {skills.map((skill, idx) => (
                                        <motion.div
                                            key={skill.name}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                                    <skill.icon className="w-3 h-3 text-neutral-400" />
                                                    {skill.name}
                                                </span>
                                                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                                                    {skill.value}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-neutral-200/60 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${skill.value}%` }}
                                                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Achievements */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                                    <Award className="w-3 h-3" />
                                    Achievements ({unlockedCount}/{achievements.length})
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {achievements.map((achievement, idx) => (
                                        <motion.div
                                            key={achievement.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className={`relative p-3 rounded-xl border text-center transition-all duration-200 ${achievement.unlocked
                                                    ? 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 shadow-sm'
                                                    : 'bg-neutral-50/50 dark:bg-neutral-900/30 border-neutral-100 dark:border-neutral-800/50 opacity-50'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">
                                                {achievement.unlocked ? achievement.icon : '🔒'}
                                            </div>
                                            <p className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 leading-tight">
                                                {achievement.title}
                                            </p>
                                            <p className="text-[9px] text-neutral-500 dark:text-neutral-500 mt-0.5 leading-tight">
                                                {achievement.desc}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
