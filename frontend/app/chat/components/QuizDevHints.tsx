'use client'

import type { AgentQuestion } from '@/types'

export function quizDevHintsEnabled(): boolean {
    return process.env.NODE_ENV === 'development'
}

/** Backend index when present and in range; otherwise null (e.g. profile quizzes). */
export function resolvedCorrectOptionIndex(question: AgentQuestion): number | null {
    const raw = question.correct_option_index
    if (raw === null || raw === undefined) return null
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 0 || n >= question.options.length) return null
    return n
}

type DevHintTone = 'surface' | 'embedded'

export function QuizDevAnswerBanner({ question, tone = 'surface' }: { question: AgentQuestion; tone?: DevHintTone }) {
    if (!quizDevHintsEnabled()) return null
    const idx = resolvedCorrectOptionIndex(question)
    if (idx === null) return null
    const letter = String.fromCharCode(65 + idx)
    const shell =
        tone === 'embedded'
            ? 'rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-[11px] font-medium leading-snug text-amber-100/95'
            : 'rounded-xl border border-amber-500/45 bg-amber-500/10 px-3 py-2 text-[11px] font-medium leading-snug text-amber-900 dark:text-amber-200/95'
    const label =
        tone === 'embedded'
            ? 'font-semibold uppercase tracking-wider text-amber-200/90'
            : 'font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300/90'
    return (
        <div role="note" className={shell}>
            <span className={label}>Dev</span>
            {' · '}
            Correct: option {letter} (index {idx})
        </div>
    )
}

export function QuizDevOptionMarker({ show, tone = 'surface' }: { show: boolean; tone?: DevHintTone }) {
    if (!quizDevHintsEnabled() || !show) return null
    const shell =
        tone === 'embedded'
            ? 'inline-flex shrink-0 items-center rounded-md border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100'
            : 'inline-flex shrink-0 items-center rounded-md border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200'
    return <span className={shell}>Dev · correct</span>
}
