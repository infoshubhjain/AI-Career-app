'use client'

import { UserProfile } from '@/types';
import { Trophy, Flame, Target, Star, Zap, BookOpen, Award, X, TrendingUp, Rocket, Brain, Map, Lightbulb, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface DashboardSectionProps {
    profile: UserProfile | null;
    isOpen: boolean;
    onClose: () => void;
}

/* ─── skill categories derived from XP (mock derivation) ─── */
const SKILL_CATEGORIES = [
    { name: 'Problem Solving', icon: Zap },
    { name: 'Technical Skills', icon: Target },
    { name: 'Communication', icon: BookOpen },
    { name: 'Leadership', icon: Star },
    { name: 'Adaptability', icon: TrendingUp },
];

/* ─── achievement definitions ─── */
const ACHIEVEMENTS = [
    { id: 'first_chat', title: 'First Steps', desc: 'Started your first conversation', icon: Rocket, xpThreshold: 0 },
    { id: 'quiz_taker', title: 'Quiz Taker', desc: 'Completed your first quiz', icon: Brain, xpThreshold: 20 },
    { id: 'streak_3', title: 'On a Roll', desc: '3-day learning streak', icon: Flame, xpThreshold: 50 },
    { id: 'roadmap_gen', title: 'Path Finder', desc: 'Generated your first roadmap', icon: Map, xpThreshold: 30 },
    { id: 'level_5', title: 'Rising Star', desc: 'Reached level 5', icon: Star, xpThreshold: 100 },
    { id: 'xp_250', title: 'Knowledge Seeker', desc: 'Earned 250 XP', icon: Lightbulb, xpThreshold: 250 },
    { id: 'xp_500', title: 'Expert Path', desc: 'Earned 500 XP', icon: GraduationCap, xpThreshold: 500 },
    { id: 'xp_1000', title: 'Mastery', desc: 'Earned 1000 XP', icon: Trophy, xpThreshold: 1000 },
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
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 flex w-[340px] flex-col overflow-hidden border-l border-[color:var(--line)] bg-[color:var(--surface)] backdrop-blur-xl shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] sm:w-[380px]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[color:var(--line)] p-5">
                            <h2 className="text-lg font-semibold text-[color:var(--ink)]">Dashboard</h2>
                            <button
                                onClick={onClose}
                                className="rounded-full border border-transparent p-2 text-[color:var(--ink-faint)] transition hover:border-[color:var(--line)] hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                                aria-label="Close dashboard"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto p-5 text-[color:var(--ink)]">
                            {/* Profile Card */}
                            <div className="space-y-3 text-center">
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    className="relative mx-auto h-20 w-20"
                                >
                                    <div className="flex h-full w-full items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-2)] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)]">
                                        <Star className="h-10 w-10 text-[color:var(--accent)]" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--ink)]">
                                        Lv.{level}
                                    </div>
                                </motion.div>
                                <div>
                                    <h3 className="text-lg font-semibold tracking-[0.02em]">
                                        {profile?.display_name || 'Career Explorer'}
                                    </h3>
                                    <p className="text-xs font-medium text-[color:var(--ink-faint)]">
                                        {level < 3 ? 'Apprentice' : level < 6 ? 'Journeyman' : level < 10 ? 'Expert' : 'Master'}
                                    </p>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4 text-center">
                                    <Flame className="mx-auto mb-2 h-5 w-5 text-[color:var(--accent)]" />
                                    <p className="text-xl font-semibold">{profile?.streak_days || 0}</p>
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Day Streak</p>
                                </div>
                                <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4 text-center">
                                    <Target className="mx-auto mb-2 h-5 w-5 text-[color:var(--accent-2)]" />
                                    <p className="text-xl font-semibold">{xp}</p>
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Total XP</p>
                                </div>
                            </div>

                            {/* Skill Progress Bars */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                                    <TrendingUp className="h-3 w-3" />
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
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--ink-soft)]">
                                                    <skill.icon className="h-3 w-3 text-[color:var(--ink-faint)]" />
                                                    {skill.name}
                                                </span>
                                                <span className="text-[10px] font-bold text-[color:var(--ink-faint)]">
                                                    {skill.value}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)]">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${skill.value}%` }}
                                                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                                                    style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Achievements */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                                    <Award className="h-3 w-3" />
                                    Achievements ({unlockedCount}/{achievements.length})
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {achievements.map((achievement, idx) => (
                                        <motion.div
                                            key={achievement.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className={`relative rounded-xl border p-3 text-center transition-all duration-200 ${
                                                achievement.unlocked
                                                    ? 'border-[color:var(--line-strong)] bg-[color:var(--surface-2)]'
                                                    : 'border-[color:var(--line)] bg-[color:var(--surface-2)] opacity-50'
                                            }`}
                                        >
                                            <div className="mb-2 flex justify-center">
                                                <achievement.icon className="h-5 w-5 text-[color:var(--accent)]" />
                                            </div>
                                            <p className="text-[10px] font-bold leading-tight text-[color:var(--ink)]">
                                                {achievement.title}
                                            </p>
                                            <p className="mt-0.5 text-[9px] leading-tight text-[color:var(--ink-faint)]">
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
