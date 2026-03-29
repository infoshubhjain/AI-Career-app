'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, Target } from 'lucide-react'

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
    const [chosen, setChosen] = useState<'beginning' | 'placement' | null>(null)

    const handleBeginning = () => {
        if (busy) return
        setChosen('beginning')
        onStartAtBeginning()
    }

    const handlePlacement = () => {
        if (busy) return
        setChosen('placement')
        onTakePlacementTest()
    }

    // Reset chosen state when overlay closes
    const isLoading = busy && chosen !== null

    return (
        <AnimatePresence onExitComplete={() => setChosen(null)}>
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
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.24),_transparent_40%)]" />

                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                /* ── Loading state ── */
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="relative flex flex-col items-center gap-5 py-4"
                                >
                                    <div className="relative">
                                        <div className="h-20 w-20 rounded-full border border-white/15 bg-white/10 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-blue-300 animate-spin" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">
                                            {chosen === 'beginning' ? 'Preparing Your First Lesson' : 'Setting Up Placement Test'}
                                        </p>
                                        <h2 className="text-2xl font-semibold sm:text-3xl">
                                            {chosen === 'beginning'
                                                ? 'Building your learning plan…'
                                                : 'Calibrating your starting point…'}
                                        </h2>
                                        <p className="text-sm text-white/60">
                                            {chosen === 'beginning'
                                                ? 'Generating lesson topics for your first skill.'
                                                : 'Preparing knowledge probes to find your frontier.'}
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                /* ── Choice state ── */
                                <motion.div
                                    key="choice"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="relative"
                                >
                                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10">
                                        <Target className="h-9 w-9 text-blue-200" />
                                    </div>
                                    <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Roadmap Locked In
                                    </p>
                                    <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">This is your selected roadmap!</h2>
                                    <p className="mt-5 text-2xl font-bold text-white sm:text-3xl">{roadmapLabel}</p>
                                    <p className="mt-4 text-sm text-white/70 sm:text-base">
                                        Choose whether you want to begin from the first skill or use a placement test to find your starting point.
                                    </p>
                                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                                        <button
                                            type="button"
                                            onClick={handleBeginning}
                                            disabled={busy}
                                            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Start at Beginning
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePlacement}
                                            disabled={busy}
                                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Take Placement Test
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
