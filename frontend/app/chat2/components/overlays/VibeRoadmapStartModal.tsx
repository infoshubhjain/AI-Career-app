'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Route, Sparkles } from 'lucide-react'

interface VibeRoadmapStartModalProps {
    visible: boolean
    roadmapLabel: string
    busy?: boolean
    onStartAtBeginning: () => void
    onTakePlacementTest: () => void
}

export function VibeRoadmapStartModal({
    visible,
    roadmapLabel,
    busy = false,
    onStartAtBeginning,
    onTakePlacementTest,
}: VibeRoadmapStartModalProps) {
    const [chosen, setChosen] = useState<'beginning' | 'placement' | null>(null)
    const isLoading = busy && chosen !== null

    return (
        <AnimatePresence onExitComplete={() => setChosen(null)}>
            {visible ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-lg"
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 p-8 text-center shadow-2xl"
                    >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.2),transparent_50%)]" />
                        <div className="relative">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10">
                                <Route className="h-7 w-7 text-violet-300" />
                            </div>
                            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Roadmap ready</p>
                            <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">{roadmapLabel}</h2>
                            <p className="mt-4 text-sm leading-relaxed text-zinc-400">How would you like to begin?</p>

                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div
                                        key="load"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-8 flex flex-col items-center gap-3"
                                    >
                                        <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                                        <p className="text-sm text-zinc-500">Setting up…</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="choices"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="mt-8 flex flex-col gap-3"
                                    >
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setChosen('beginning')
                                                onStartAtBeginning()
                                            }}
                                            className="rounded-2xl border border-white/10 bg-zinc-900/80 py-3.5 text-sm font-medium text-zinc-100 transition hover:border-teal-400/30 hover:bg-zinc-800/80 disabled:opacity-50"
                                        >
                                            <Sparkles className="mx-auto mb-1 h-4 w-4 text-teal-400" />
                                            Start at beginning
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setChosen('placement')
                                                onTakePlacementTest()
                                            }}
                                            className="rounded-2xl border border-violet-500/30 bg-violet-500/10 py-3.5 text-sm font-medium text-violet-100 transition hover:bg-violet-500/20 disabled:opacity-50"
                                        >
                                            Take placement test
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
