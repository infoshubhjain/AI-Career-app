'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'

interface TaskRevealOverlayProps {
    visible: boolean
    topicTitle: string
    skillTitle: string
    domainTitle?: string | null
    actionLabel?: string
    onComplete: () => void
}

export function TaskRevealOverlay({ visible, topicTitle, skillTitle, domainTitle, actionLabel = 'Get started', onComplete }: TaskRevealOverlayProps) {
    return (
        <AnimatePresence>
            {visible ? (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[85] flex items-center justify-center bg-black/65 px-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] border border-[color:var(--line)] bg-[color:var(--surface)] px-8 py-10 text-center text-[color:var(--ink)] shadow-[0_40px_120px_-70px_rgba(0,0,0,0.9)]"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(127,209,194,0.2),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(215,182,106,0.18),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(143,180,255,0.14),_transparent_40%)]" />
                        <div className="relative">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-2)]">
                                <BookOpen className="h-9 w-9 text-[color:var(--accent-2)]" />
                            </div>
                            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                                <Sparkles className="h-3.5 w-3.5" />
                                New Task Unlocked
                            </p>
                            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">Here&apos;s your next learning focus</h2>
                            <p className="mt-5 text-2xl font-bold text-[color:var(--ink)] sm:text-3xl">{topicTitle}</p>
                            <p className="mt-4 text-sm text-[color:var(--ink-soft)] sm:text-base">
                                {skillTitle}
                                {domainTitle ? ` in ${domainTitle}` : ''}
                            </p>
                            <div className={`mt-8 inline-flex rounded-full p-[1px] ${actionLabel ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 shadow-[0_0_24px_rgba(59,130,246,0.35)]' : 'bg-[color:var(--line)]'}`}>
                            <button
                                type="button"
                                onClick={onComplete}
                                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--ink)] transition"
                            >
                                {actionLabel}
                            </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
