'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'

import type { AgentQuestion } from '@/types'
import { MarkdownRenderer } from './MarkdownRenderer'

interface QuizOverlayProps {
    question: AgentQuestion
    busy: boolean
    error?: string | null
    onSelect: (optionId: string, optionIndex: number, optionLabel: string) => Promise<void> | void
    onClose: () => void
}

export function QuizOverlay({ question, busy, error = null, onSelect, onClose }: QuizOverlayProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [revealAnswer, setRevealAnswer] = useState(false)

    useEffect(() => {
        setSelectedIndex(null)
        setRevealAnswer(false)
    }, [question.id])

    useEffect(() => {
        if (!error) return
        setSelectedIndex(null)
        setRevealAnswer(false)
    }, [error])

    const badgeLabel =
        question.kind === 'profile'
            ? 'Onboarding'
            : question.kind === 'placement_probe' || question.kind === 'placement_confirm'
              ? 'Placement Checkpoint'
              : 'Quiz Checkpoint'

    const correctIndex = question.correct_option_index ?? null

    async function handleSelect(optionId: string, optionIndex: number, optionLabel: string) {
        if (busy || revealAnswer) return
        setSelectedIndex(optionIndex)
        setRevealAnswer(true)
        window.setTimeout(() => {
            void onSelect(optionId, optionIndex, optionLabel)
        }, 700)
    }

    function optionClassName(index: number) {
        if (!revealAnswer || correctIndex === null) {
            return 'border-[color:var(--line)] bg-[color:var(--surface-2)] hover:border-[color:var(--accent)]'
        }
        if (index === correctIndex) {
            return 'border-[color:var(--accent-2)] bg-[color:var(--accent-2)] text-[color:var(--ink)]'
        }
        if (selectedIndex === index && index !== correctIndex) {
            return 'border-red-400/50 bg-red-500/15 text-red-50'
        }
        return 'border-[color:var(--line)] bg-[color:var(--surface-2)] opacity-70'
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.97, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_30px_100px_-60px_rgba(0,0,0,0.9)]"
                >
                    <div className="border-b border-[color:var(--line)] px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                                    {badgeLabel}
                                </p>
                                <div className="mt-3 text-[color:var(--ink)]">
                                    <MarkdownRenderer content={question.prompt} variant="compact" size="lg" />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy}
                                aria-label="Close quiz popup"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 p-6">
                        {question.options.map((option, index) => (
                            <button
                                key={option.id}
                                onClick={() => void handleSelect(option.id, index, option.label)}
                                disabled={busy || revealAnswer}
                                className={`w-full rounded-2xl border px-5 py-4 text-left text-[color:var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-60 ${optionClassName(index)}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium leading-relaxed">
                                        <MarkdownRenderer content={option.label} variant="compact" size="sm" />
                                    </span>
                                    {index === correctIndex ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--accent-2)] bg-[color:var(--accent-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)]">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Correct
                                        </span>
                                    ) : null}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-[color:var(--line)] px-6 py-4 text-sm text-[color:var(--ink-faint)]">
                        {busy
                            ? 'Submitting your answer...'
                            : revealAnswer
                              ? selectedIndex === correctIndex
                                  ? 'Correct choice locked in. Continuing...'
                                  : 'Showing the correct answer. Continuing...'
                              : error || 'Choose one answer to continue, or close this popup and come back later.'}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
