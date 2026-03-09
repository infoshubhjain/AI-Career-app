'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'

interface TaskRevealOverlayProps {
    visible: boolean
    topicTitle: string
    skillTitle: string
    domainTitle?: string | null
    onComplete: () => void
}

export function TaskRevealOverlay({ visible, topicTitle, skillTitle, domainTitle, onComplete }: TaskRevealOverlayProps) {
    useEffect(() => {
        if (!visible) return
        const timeout = window.setTimeout(onComplete, 2200)
        return () => window.clearTimeout(timeout)
    }, [visible, onComplete])

    return (
        <AnimatePresence>
            {visible ? (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[85] flex items-center justify-center bg-neutral-950/70 px-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2.25rem] border border-white/15 bg-neutral-950 px-8 py-10 text-center text-white shadow-2xl"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.24),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.18),_transparent_38%)]" />
                        <div className="relative">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10">
                                <BookOpen className="h-9 w-9 text-emerald-200" />
                            </div>
                            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                                <Sparkles className="h-3.5 w-3.5" />
                                New Task Unlocked
                            </p>
                            <h2 className="mt-6 text-3xl font-semibold sm:text-4xl">Here&apos;s your next learning focus</h2>
                            <p className="mt-5 text-2xl font-bold text-white sm:text-3xl">{topicTitle}</p>
                            <p className="mt-4 text-sm text-white/70 sm:text-base">
                                {skillTitle}
                                {domainTitle ? ` in ${domainTitle}` : ''}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
