'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, X } from 'lucide-react'

import type { AgentQuestion, QuizOutcomeFeedback } from '@/types'
import { MarkdownRenderer } from './MarkdownRenderer'
import { QuizDevAnswerBanner, QuizDevOptionMarker, resolvedCorrectOptionIndex } from './QuizDevHints'

interface QuizOverlayProps {
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

export function QuizOverlay({
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
}: QuizOverlayProps) {
    const badgeLabel =
        question.kind === 'profile'
            ? 'Onboarding'
            : question.kind === 'placement_probe' || question.kind === 'placement_confirm'
              ? 'Placement Checkpoint'
              : 'Quiz Checkpoint'

    const showOutcome = Boolean(outcomeFeedback)
    const isDisabled = busy || submitting || nextReady || showOutcome
    const canSubmit = selectedIndex !== null && selectedIndex !== undefined && !submitting && !nextReady && !showOutcome
    const correctOptionIndex = resolvedCorrectOptionIndex(question)

    function optionClassName(index: number) {
        if (selectedIndex === index) {
            return 'border-[color:var(--accent-2)] bg-[color:var(--surface-2)] text-[color:var(--ink)]'
        }
        return 'border-[color:var(--line)] bg-[color:var(--surface-2)] hover:border-[color:var(--accent)]'
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
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
                                    {showOutcome ? 'Result' : badgeLabel}
                                </p>
                                {showOutcome ? (
                                    <p
                                        className={`mt-1 text-sm font-semibold ${
                                            outcomeFeedback?.is_correct
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-amber-700 dark:text-amber-300'
                                        }`}
                                    >
                                        {outcomeFeedback?.is_correct ? 'Correct' : 'Incorrect'}
                                    </p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={busy || submitting}
                                aria-label="Close quiz popup"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="relative min-h-[min(52vh,24rem)] overflow-hidden">
                        <motion.div
                            className="w-full px-6 py-6"
                            initial={false}
                            animate={{ x: showOutcome ? '-100%' : '0%' }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -40 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="space-y-6"
                                >
                                    <div className="text-[color:var(--ink)]">
                                        <MarkdownRenderer content={question.prompt} variant="compact" size="lg" />
                                    </div>
                                    <QuizDevAnswerBanner question={question} />
                                    <div className="space-y-3">
                                        {question.options.map((option, index) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isDisabled) return
                                                    onSelectIndex(index)
                                                }}
                                                disabled={isDisabled}
                                                className={`w-full rounded-2xl border px-5 py-4 text-left text-[color:var(--ink)] transition disabled:cursor-not-allowed disabled:opacity-60 ${optionClassName(index)}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-medium leading-relaxed">
                                                        <MarkdownRenderer content={option.label} variant="compact" size="sm" />
                                                    </span>
                                                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                                        <QuizDevOptionMarker show={correctOptionIndex === index} />
                                                        {selectedIndex === index ? (
                                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--accent-2)] bg-[color:var(--accent-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink)]">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
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
                            className="absolute inset-0 overflow-y-auto bg-[color:var(--surface)] px-6 py-6"
                            initial={false}
                            animate={{ x: showOutcome ? '0%' : '100%' }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {outcomeFeedback ? (
                                <div className="text-[color:var(--ink)]">
                                    <MarkdownRenderer
                                        content={outcomeFeedback.explanation_markdown}
                                        variant="compact"
                                        size="md"
                                    />
                                </div>
                            ) : null}
                        </motion.div>
                    </div>

                    <div className="border-t border-[color:var(--line)] px-6 py-4 text-sm text-[color:var(--ink-faint)]">
                        <div className="flex items-center justify-between gap-4">
                            <span>
                                {showOutcome
                                    ? 'Read the explanation, then continue.'
                                    : submitting
                                      ? 'Submitting your answer...'
                                      : nextReady && !showOutcome
                                        ? 'Next question is ready.'
                                        : typeof error === 'string' && error
                                          ? error
                                          : 'Choose an answer, then submit when ready.'}
                            </span>
                            <div
                                className={`rounded-2xl p-[1px] ${
                                    showOutcome || canSubmit || (nextReady && !showOutcome)
                                        ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 shadow-[0_0_24px_rgba(59,130,246,0.35)]'
                                        : 'bg-[color:var(--line)]'
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {showOutcome ? (
                                        <motion.button
                                            key="continue"
                                            type="button"
                                            onClick={onOutcomeContinue}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2 rounded-[15px] bg-black px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink)]"
                                        >
                                            Continue
                                        </motion.button>
                                    ) : nextReady ? (
                                        <motion.button
                                            key="next"
                                            type="button"
                                            onClick={onNext}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2 rounded-[15px] bg-black px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink)]"
                                        >
                                            Next question
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            key="submit"
                                            type="button"
                                            onClick={onSubmit}
                                            disabled={!canSubmit}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2 rounded-[15px] bg-black px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink)] disabled:opacity-50"
                                        >
                                            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                            Submit
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
