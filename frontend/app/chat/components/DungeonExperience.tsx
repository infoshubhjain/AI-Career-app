'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Loader2, SendHorizontal, Skull, Sparkles, User as UserIcon } from 'lucide-react'

import { MarkdownRenderer } from './MarkdownRenderer'

export type DungeonUiPhase = 'hidden' | 'entering' | 'active' | 'outcome' | 'exiting'

export type DungeonTimelineMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
}

type Theme = 'chat' | 'vibe'

interface DungeonExperienceProps {
    phase: DungeonUiPhase
    scenarioTitle?: string | null
    messages: DungeonTimelineMessage[]
    busy: boolean
    input: string
    onInputChange: (v: string) => void
    onSubmit: (e: React.FormEvent) => void
    onAbort: () => void
    showAbort: boolean
    outcome: 'success' | 'failure' | null
    onDismiss: () => void
    theme?: Theme
}

export function dungeonBufferToMessages(
    buffer: unknown
): DungeonTimelineMessage[] {
    if (!Array.isArray(buffer)) return []
    return buffer.map((raw, i) => {
        const e = raw as { role?: string; text?: string }
        const role = e.role === 'user' ? 'user' : 'assistant'
        return {
            id: `dungeon-buf-${i}-${role}`,
            role,
            content: String(e.text || ''),
            createdAt: new Date().toISOString(),
        }
    })
}

export function DungeonExperience({
    phase,
    scenarioTitle,
    messages,
    busy,
    input,
    onInputChange,
    onSubmit,
    onAbort,
    showAbort,
    outcome,
    onDismiss,
    theme = 'chat',
}: DungeonExperienceProps) {
    const isVibe = theme === 'vibe'
    const shell = isVibe
        ? 'min-h-0 flex-1 flex flex-col rounded-2xl border border-violet-500/25 bg-zinc-950/90 shadow-[0_0_60px_-12px_rgba(139,92,246,0.45)] overflow-hidden'
        : 'flex flex-col h-full min-h-0 rounded-2xl border border-violet-500/30 bg-neutral-950/95 dark:bg-black/80 shadow-[0_0_80px_-20px_rgba(124,58,237,0.5)] overflow-hidden'

    const headerTint = isVibe
        ? 'border-b border-violet-500/20 bg-gradient-to-r from-violet-950/80 via-zinc-950/90 to-teal-950/50'
        : 'border-b border-violet-500/20 bg-gradient-to-r from-violet-950/90 via-neutral-950 to-indigo-950/80'

    return (
        <div className={`relative flex min-h-0 flex-1 flex-col ${shell}`}>
            {/* Enter immersion */}
            <AnimatePresence>
                {phase === 'entering' && (
                    <motion.div
                        key="enter"
                        className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.35),transparent_55%)]"
                            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                            className="relative h-28 w-28 rounded-full border-2 border-violet-400/40 border-t-violet-200"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        />
                        <motion.p
                            className={`relative mt-8 text-center text-sm font-medium tracking-wide ${isVibe ? 'text-violet-200' : 'text-violet-100'}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            Crossing into the scenario…
                        </motion.p>
                        <p className="relative mt-2 text-center text-xs text-violet-300/70 max-w-xs px-4">
                            Sound drops away. Your choices will have weight.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exit immersion */}
            <AnimatePresence>
                {phase === 'exiting' && (
                    <motion.div
                        key="exit"
                        className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(45,212,191,0.2),transparent_50%)]"
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                        />
                        <motion.div
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative text-center"
                        >
                            <p className={`text-sm font-semibold ${isVibe ? 'text-teal-200' : 'text-teal-100'}`}>
                                Returning to your lesson…
                            </p>
                            <p className="mt-2 text-xs text-neutral-400 max-w-xs px-6">
                                The thread below picks up where you left off.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Outcome: side dock — scene stays visible, no full-screen dim/blur */}
            <AnimatePresence>
                {phase === 'outcome' && outcome && (
                    <motion.div
                        key="outcome"
                        className="pointer-events-none absolute inset-y-6 right-2 z-20 flex max-w-[calc(100%-0.5rem)] items-center justify-end sm:right-3 sm:inset-y-8"
                        initial={{ opacity: 0, x: 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    >
                        <motion.div
                            role="status"
                            aria-labelledby="dungeon-outcome-title"
                            className={`pointer-events-auto w-[min(100%,17.5rem)] overflow-hidden rounded-2xl border p-5 text-left shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] sm:w-72 sm:p-6 ${
                                outcome === 'success'
                                    ? 'border-emerald-500/45 bg-gradient-to-b from-emerald-950/95 via-neutral-950/98 to-neutral-950'
                                    : 'border-rose-500/40 bg-gradient-to-b from-rose-950/95 via-neutral-950/98 to-neutral-950'
                            }`}
                        >
                            {outcome === 'success' ? (
                                <>
                                    <motion.div
                                        className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300"
                                        initial={{ rotate: -8, scale: 0.85 }}
                                        animate={{ rotate: 0, scale: 1 }}
                                    >
                                        <Sparkles className="h-6 w-6" />
                                    </motion.div>
                                    <h2 id="dungeon-outcome-title" className="text-lg font-bold leading-snug text-emerald-100">
                                        Scenario cleared
                                    </h2>
                                    <p className="mt-2 text-xs leading-relaxed text-emerald-200/85 sm:text-sm">
                                        You pushed through. When you’re ready, return to your lesson.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <motion.div
                                        className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300"
                                        initial={{ scale: 0.9 }}
                                        animate={{ scale: 1 }}
                                    >
                                        <Skull className="h-6 w-6" />
                                    </motion.div>
                                    <h2 id="dungeon-outcome-title" className="text-lg font-bold leading-snug text-rose-100">
                                        The scene breaks
                                    </h2>
                                    <p className="mt-2 text-xs leading-relaxed text-rose-200/80 sm:text-sm">
                                        Not every run goes your way. Exit when you’re ready to regroup.
                                    </p>
                                </>
                            )}
                            <motion.button
                                type="button"
                                onClick={onDismiss}
                                disabled={busy}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
                                    outcome === 'success'
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                                        : 'bg-gradient-to-r from-rose-600 to-orange-700 hover:from-rose-500 hover:to-orange-600'
                                }`}
                            >
                                {outcome === 'success' ? 'Complete' : 'Exit'}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`shrink-0 px-4 py-3 ${headerTint}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">Dungeon</p>
                        <h3 className="truncate text-sm font-semibold text-white">
                            {scenarioTitle || 'Live scenario'}
                        </h3>
                    </div>
                    {showAbort && phase === 'active' && (
                        <button
                            type="button"
                            onClick={onAbort}
                            disabled={busy}
                            className="shrink-0 text-xs font-medium text-violet-200/80 underline-offset-2 hover:text-white hover:underline disabled:opacity-40"
                        >
                            Leave scene
                        </button>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="mx-auto max-w-2xl space-y-5">
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.2) }}
                            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                    message.role === 'user'
                                        ? isVibe
                                            ? 'bg-zinc-700 text-zinc-200'
                                            : 'bg-neutral-700 text-neutral-100'
                                        : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md'
                                }`}
                            >
                                {message.role === 'user' ? (
                                    <UserIcon className="h-3.5 w-3.5" />
                                ) : (
                                    <Bot className="h-3.5 w-3.5" />
                                )}
                            </div>
                            <div
                                className={`min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                                    message.role === 'user'
                                        ? isVibe
                                            ? 'bg-zinc-800/90 text-zinc-100'
                                            : 'bg-neutral-800 text-neutral-100'
                                        : 'border border-violet-500/20 bg-violet-950/30 text-violet-50'
                                }`}
                            >
                                <MarkdownRenderer content={message.content} variant="compact" size="sm" />
                            </div>
                        </motion.div>
                    ))}
                    {busy && messages.length > 0 && phase === 'active' && (
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600">
                                <Bot className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex items-center gap-1 pt-2">
                                {[0, 1, 2].map(i => (
                                    <motion.span
                                        key={i}
                                        className="h-1.5 w-1.5 rounded-full bg-violet-400"
                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <form
                onSubmit={onSubmit}
                className={`shrink-0 border-t px-4 py-3 ${
                    isVibe ? 'border-violet-500/15 bg-zinc-950/80' : 'border-violet-500/15 bg-neutral-950/90'
                }`}
            >
                <div className="mx-auto flex max-w-2xl items-end gap-2">
                    <textarea
                        value={input}
                        onChange={e => onInputChange(e.target.value)}
                        placeholder={phase === 'active' ? 'What do you do?' : ''}
                        disabled={busy || phase !== 'active'}
                        rows={1}
                        className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-violet-300/40 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                if (phase === 'active' && !busy && input.trim()) {
                                    onSubmit(e as unknown as React.FormEvent)
                                }
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={busy || phase !== 'active' || !input.trim()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Send"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    </button>
                </div>
            </form>
        </div>
    )
}
