'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'

interface VibeTaskFocusModalProps {
    visible: boolean
    topicTitle: string
    skillTitle: string
    domainTitle?: string | null
    actionLabel?: string
    onComplete: () => void
}

export function VibeTaskFocusModal({
    visible,
    topicTitle,
    skillTitle,
    domainTitle,
    actionLabel = 'Continue',
    onComplete,
}: VibeTaskFocusModalProps) {
    return (
        <AnimatePresence>
            {visible ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[88] flex items-center justify-center bg-black/75 p-4 backdrop-blur-lg"
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 p-8 text-center shadow-2xl"
                    >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.12),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.12),transparent_40%)]" />
                        <div className="relative">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/25 bg-teal-500/10">
                                <BookOpen className="h-8 w-8 text-teal-300" />
                            </div>
                            <p className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                                <Sparkles className="h-3 w-3 text-teal-400/80" />
                                Next focus
                            </p>
                            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">{topicTitle}</h2>
                            <p className="mt-3 text-sm text-zinc-400">
                                {skillTitle}
                                {domainTitle ? ` · ${domainTitle}` : ''}
                            </p>
                            <button
                                type="button"
                                onClick={onComplete}
                                className="mt-8 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                            >
                                {actionLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
