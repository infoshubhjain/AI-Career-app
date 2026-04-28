'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, X } from 'lucide-react'

import { MarkdownRenderer } from '@/app/chat/components/MarkdownRenderer'
import { QuizDevAnswerBanner, QuizDevOptionMarker, resolvedCorrectOptionIndex } from '@/app/chat/components/QuizDevHints'
import type { AgentQuestion, QuizOutcomeFeedback } from '@/types'

interface VibeQuizModalProps {
    question: AgentQuestion
    busy: boolean
    submitting: boolean
    selectedIndex: number | null
    nextReady: boolean
    error?: string | null
    outcomeFeedback: QuizOutcomeFeedback | null
    onSelectIndex: (optionIndex: number) => void
    onSubmit: () => Promise<void> | void
    onNext: () => void
    onOutcomeContinue: () => void
    onClose: () => void
}

export function VibeQuizModal({
    question,
    busy,
    submitting,
    selectedIndex,
    nextReady,
    error = null,
    outcomeFeedback,
    onSelectIndex,
    onSubmit,
    onNext,
    onOutcomeContinue,
    onClose,
}: VibeQuizModalProps) {
    const badgeLabel =
        question.kind === 'profile'
            ? 'Onboarding'
            : question.kind === 'placement_probe' || question.kind === 'placement_confirm'
              ? 'Placement'
              : 'Quiz'

    const showOutcome = Boolean(outcomeFeedback)
    const isDisabled = busy || submitting || nextReady || showOutcome
    const canSubmit = selectedIndex !== null && selectedIndex !== undefined && !submitting && !nextReady && !showOutcome
    const correctOptionIndex = resolvedCorrectOptionIndex(question)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 12 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/15 via-transparent to-teal-600/10" />
                    <div className="relative flex items-start justify-between border-b border-white/10 px-6 py-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300/80">
                                {showOutcome ? 'Result' : badgeLabel}
                            </p>
                            {showOutcome ? (
                                <p
                                    className={`mt-1 text-sm font-semibold ${
                                        outcomeFeedback?.is_correct ? 'text-teal-300' : 'text-amber-300'
                                    }`}
                                >
                                    {outcomeFeedback?.is_correct ? 'Correct' : 'Incorrect'}
                                </p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="rounded-full p-2 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 disabled:opacity-50"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="relative max-h-[min(70vh,34rem)] min-h-[min(52vh,22rem)] overflow-hidden">
                        <motion.div
                            className="max-h-[min(70vh,34rem)] overflow-y-auto px-6 py-6"
                            initial={false}
                            animate={{ x: showOutcome ? '-100%' : '0%' }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, x: 36 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -36 }}
                                    transition={{ duration: 0.28 }}
                                    className="space-y-5"
                                >
                                    <div className="text-zinc-100">
                                        <MarkdownRenderer content={question.prompt} variant="compact" size="lg" />
                                    </div>
                                    <QuizDevAnswerBanner question={question} tone="embedded" />
                                    <div className="space-y-2.5">
                                        {question.options.map((option, index) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isDisabled) return
                                                    onSelectIndex(index)
                                                }}
                                                disabled={isDisabled}
                                                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition disabled:opacity-50 ${
                                                    selectedIndex === index
                                                        ? 'border-teal-400/50 bg-teal-500/15 text-zinc-50'
                                                        : 'border-white/10 bg-zinc-900/50 text-zinc-200 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-medium leading-relaxed">
                                                        <MarkdownRenderer content={option.label} variant="compact" size="sm" />
                                                    </span>
                                                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                                        <QuizDevOptionMarker show={correctOptionIndex === index} tone="embedded" />
                                                        {selectedIndex === index ? (
                                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-200">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Selected
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>

                        <motion.div
                            className="absolute inset-0 overflow-y-auto bg-zinc-950/95 px-6 py-6"
                            initial={false}
                            animate={{ x: showOutcome ? '0%' : '100%' }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {outcomeFeedback ? (
                                <div className="text-zinc-100">
                                    <MarkdownRenderer
                                        content={outcomeFeedback.explanation_markdown}
                                        variant="compact"
                                        size="md"
                                    />
                                </div>
                            ) : null}
                        </motion.div>
                    </div>
                    <div className="relative flex items-center justify-between gap-4 border-t border-white/10 px-6 py-4 text-sm text-zinc-500">
                        <span>
                            {showOutcome
                                ? 'Read the explanation, then continue.'
                                : submitting
                                  ? 'Submitting…'
                                  : nextReady && !showOutcome
                                    ? 'Next question ready.'
                                    : typeof error === 'string' && error
                                      ? error
                                      : 'Choose an answer, then submit.'}
                        </span>
                        {showOutcome ? (
                            <button
                                type="button"
                                onClick={onOutcomeContinue}
                                className="rounded-xl bg-gradient-to-r from-violet-500 to-teal-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                            >
                                Continue
                            </button>
                        ) : nextReady ? (
                            <button
                                type="button"
                                onClick={onNext}
                                className="rounded-xl bg-gradient-to-r from-violet-500 to-teal-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!canSubmit}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-teal-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-40"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Submit
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
