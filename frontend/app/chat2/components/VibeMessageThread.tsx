'use client'

import type { Ref } from 'react'
import { motion } from 'framer-motion'
import { Bot, ChevronRight, Loader2, User as UserIcon } from 'lucide-react'

import { MarkdownRenderer } from '@/app/chat/components/MarkdownRenderer'
import type { Chat2TimelineMessage } from '../sessionUtils'

interface VibeMessageThreadProps {
    messages: Chat2TimelineMessage[]
    busy: boolean
    showDungeonButton: boolean
    showQuizReadyButton: boolean
    quizReadyButtonLabel: string
    onDungeon: () => void
    onQuizReady: () => void
    scrollContainerRef: Ref<HTMLDivElement>
}

export function VibeMessageThread({
    messages,
    busy,
    showDungeonButton,
    showQuizReadyButton,
    quizReadyButtonLabel,
    onDungeon,
    onQuizReady,
    scrollContainerRef,
}: VibeMessageThreadProps) {
    return (
        <div
            ref={scrollContainerRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-5"
        >
            {messages.length === 0 ? (
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
                    <p className="text-sm leading-relaxed text-zinc-500">
                        Your conversation appears here. Describe a career goal below to begin.
                    </p>
                </div>
            ) : (
                <div className="min-w-0 space-y-5">
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.12) }}
                            className={`flex min-w-0 max-w-full gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                    message.role === 'user'
                                        ? 'bg-zinc-700 text-zinc-200'
                                        : 'bg-gradient-to-br from-violet-500 to-teal-500 text-white shadow-md'
                                }`}
                            >
                                {message.role === 'user' ? (
                                    <UserIcon className="h-3.5 w-3.5" />
                                ) : (
                                    <Bot className="h-3.5 w-3.5" />
                                )}
                            </div>
                            <div
                                className={`min-w-0 flex-1 max-w-full rounded-2xl px-3.5 py-2.5 ${
                                    message.role === 'user'
                                        ? message.variant === 'ambition'
                                            ? 'bg-gradient-to-br from-violet-600 to-teal-600 text-white'
                                            : 'bg-zinc-800/90 text-zinc-100'
                                        : 'bg-transparent text-zinc-100'
                                }`}
                            >
                                <div className="vibe-md min-w-0 max-w-full break-words text-[15px] leading-relaxed [overflow-wrap:anywhere] [&_img]:max-w-full [&_img]:h-auto [&_pre]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto">
                                    <MarkdownRenderer content={message.content} variant="compact" size="sm" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {busy && messages.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex min-w-0 max-w-full gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-teal-500">
                        <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex items-center gap-1 pt-2">
                        {[0, 1, 2].map(i => (
                            <motion.span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-zinc-500"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                        ))}
                    </div>
                </motion.div>
            )}

            {(showDungeonButton || showQuizReadyButton) && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 min-w-0 max-w-full border-t border-white/[0.06] pt-5"
                >
                    <p className="mb-3 break-words text-sm text-zinc-500">
                        {showDungeonButton
                            ? 'Ready to check what you learned? Try an immersive scene, or start the quiz—your thread stays above.'
                            : 'When you are ready, start the quiz—your thread stays above.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {showDungeonButton && (
                            <button
                                type="button"
                                onClick={onDungeon}
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-950/50 px-4 py-2.5 text-sm font-semibold text-violet-100 shadow-md transition hover:bg-violet-900/40 disabled:opacity-40"
                            >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                                Dungeon
                            </button>
                        )}
                        {showQuizReadyButton && (
                            <button
                                type="button"
                                onClick={onQuizReady}
                                disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-40"
                            >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                                {quizReadyButtonLabel}
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
