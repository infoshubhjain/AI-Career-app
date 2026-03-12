'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Target } from 'lucide-react'

interface RoadmapRevealOverlayProps {
    visible: boolean
    roadmapLabel: string
    busy?: boolean
    onStartAtBeginning: () => void
    onTakePlacementTest: () => void
}

export function RoadmapRevealOverlay({
    visible,
    roadmapLabel,
    busy = false,
    onStartAtBeginning,
    onTakePlacementTest,
}: RoadmapRevealOverlayProps) {
    return (
        <AnimatePresence>
            {visible ? (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] border border-[color:var(--line)] bg-[color:var(--surface)] px-8 py-10 text-center text-[color:var(--ink)] shadow-[0_40px_120px_-70px_rgba(0,0,0,0.9)]"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(215,182,106,0.18),_transparent_50%),radial-gradient(circle_at_bottom_right,_rgba(127,209,194,0.16),_transparent_45%)]" />
                        <div className="relative">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-2)]">
                                <Target className="h-9 w-9 text-[color:var(--accent)]" />
                            </div>
                            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Roadmap Locked In
                            </p>
                            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">This is your selected roadmap!</h2>
                            <p className="mt-5 text-2xl font-bold text-[color:var(--ink)] sm:text-3xl">{roadmapLabel}</p>
                            <p className="mt-4 text-sm text-[color:var(--ink-soft)] sm:text-base">
                                Choose whether you want to begin from the first skill or use a placement test to find your starting point.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                                <button
                                    type="button"
                                    onClick={onStartAtBeginning}
                                    disabled={busy}
                                    className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Start at Beginning
                                </button>
                                <button
                                    type="button"
                                    onClick={onTakePlacementTest}
                                    disabled={busy}
                                    className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] px-6 py-3 text-sm font-semibold text-[#1c160a] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Take Placement Test
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
