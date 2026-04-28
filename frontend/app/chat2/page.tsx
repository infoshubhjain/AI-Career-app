'use client'

import { useMemo, useRef } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { FloatingConversationCard } from './components/FloatingConversationCard'
import { VibeAmbientBackground } from './components/VibeAmbientBackground'
import { VibeMessageThread } from './components/VibeMessageThread'
import { VibeComposer } from './components/chrome/VibeComposer'
import { VibeCornerControls } from './components/chrome/VibeCornerControls'
import { VibeXpPill } from './components/chrome/VibeXpPill'
import { VibeProjectsDrawer } from './components/drawer/VibeProjectsDrawer'
import { VibeQuizModal } from './components/overlays/VibeQuizModal'
import { VibeRoadmapLoading } from './components/overlays/VibeRoadmapLoading'
import { VibeRoadmapStartModal } from './components/overlays/VibeRoadmapStartModal'
import { VibeTaskFocusModal } from './components/overlays/VibeTaskFocusModal'
import { getChatScrollStorageKey, useChatScrollPersistence } from '@/app/lib/chatScrollPersistence'

import { DungeonExperience } from '@/app/chat/components/DungeonExperience'

import { useChat2Session } from './hooks/useChat2Session'

export default function Chat2Page() {
    const { user, loading } = useAuth()
    const messagesScrollRef = useRef<HTMLDivElement>(null)
    const s = useChat2Session(user, messagesScrollRef)

    const chatScrollStorageKey = useMemo(
        () => getChatScrollStorageKey({ userId: user?.id, sessionId: s.session?.session_id, projectId: s.selectedProjectId }),
        [user?.id, s.session?.session_id, s.selectedProjectId]
    )
    useChatScrollPersistence(messagesScrollRef, {
        storageKey: chatScrollStorageKey,
        messagesLength: s.dungeonPhase === 'hidden' ? s.messages.length : s.dungeonMessages.length,
        busy: s.busy,
        sessionActive: Boolean(s.session?.session_id),
    })

    if (loading) {
        return (
            <div className="relative flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-x-hidden overflow-y-hidden">
                <VibeAmbientBackground />
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400/30 border-t-teal-400" />
                    <p className="text-sm text-zinc-400">Loading…</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="relative flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-x-hidden overflow-y-hidden p-6">
                <VibeAmbientBackground />
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/70 p-8 text-center shadow-2xl backdrop-blur-xl"
                >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-teal-500">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="mt-5 text-xl font-semibold text-zinc-50">Sign in</h1>
                    <p className="mt-2 text-sm text-zinc-500">Save projects and progress to your account.</p>
                    <Link
                        href="/auth/login"
                        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 py-3 text-sm font-semibold text-white"
                    >
                        Sign in
                    </Link>
                </motion.div>
            </div>
        )
    }

    const level = s.profile?.current_level ?? 1
    const xp = s.profile?.xp ?? 0

    return (
        <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-hidden">
            <VibeAmbientBackground />
            <VibeCornerControls onOpenDrawer={() => s.setDrawerOpen(true)} onOpenDashboardStub={() => s.setDashboardStubOpen(true)} />
            {s.profile ? <VibeXpPill level={level} xp={xp} /> : null}

            <VibeRoadmapLoading visible={s.isRoadmapLoading} query={s.roadmapCreationQuery} />

            <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-x-hidden px-4 py-3 sm:py-4">
                <FloatingConversationCard className="h-[min(100%,calc(100dvh-7rem))] max-h-[min(calc(100dvh-7rem),52rem)] min-h-[12rem] w-full max-w-[42rem]">
                    <AnimatePresence mode="wait">
                        {s.dungeonPhase === 'hidden' ? (
                            <motion.div
                                key="chat2-lecture"
                                className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, filter: 'blur(8px)' }}
                                transition={{ duration: 0.3 }}
                            >
                                <VibeMessageThread
                                    messages={s.messages}
                                    busy={s.busy}
                                    showDungeonButton={s.showDungeonButton}
                                    showQuizReadyButton={s.showQuizReadyButton}
                                    quizReadyButtonLabel={s.quizReadyButtonLabel}
                                    onDungeon={() => void s.handleDungeonStart()}
                                    onQuizReady={() => void s.handleQuizReadyFromButton()}
                                    scrollContainerRef={messagesScrollRef}
                                />
                                <VibeComposer
                                    value={s.input}
                                    onChange={s.setInput}
                                    onSubmit={s.handleSubmit}
                                    placeholder={s.placeholder}
                                    disabled={s.isStartModeOverlayOpen || Boolean(s.pendingQuestion)}
                                    busy={s.busy}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="chat2-dungeon"
                                className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden px-1 pt-1"
                                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <DungeonExperience
                                    phase={s.dungeonPhase}
                                    scenarioTitle={s.session?.state?.dungeon?.scenario_title ?? null}
                                    messages={s.dungeonMessages}
                                    busy={s.busy}
                                    input={s.dungeonInput}
                                    onInputChange={s.setDungeonInput}
                                    onSubmit={s.handleDungeonSubmit}
                                    onAbort={() => void s.handleDungeonAbort()}
                                    showAbort={!s.dungeonResolved && s.dungeonPhase === 'active'}
                                    outcome={s.dungeonOutcome}
                                    onDismiss={() => void s.handleDungeonDismissFromOutcome()}
                                    theme="vibe"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </FloatingConversationCard>
            </div>

            {s.pendingQuestion && !s.isQuizOverlayOpen && (
                <button
                    type="button"
                    onClick={s.reopenQuizOverlay}
                    disabled={s.busy}
                    className="fixed bottom-20 left-5 z-30 rounded-full border border-amber-400/40 bg-amber-950/80 px-4 py-2 text-xs font-medium text-amber-100 shadow-lg backdrop-blur-md transition hover:bg-amber-900/80 disabled:opacity-50 sm:bottom-6"
                >
                    Quiz waiting — open
                </button>
            )}

            <VibeProjectsDrawer
                open={s.drawerOpen}
                onClose={() => s.setDrawerOpen(false)}
                projects={s.projects}
                selectedProjectId={s.selectedProjectId}
                busy={s.busy}
                onSelect={id => void s.loadProject(id)}
                onDelete={id => void s.handleDeleteProject(id)}
                onStartNew={s.beginNewProject}
                profileLevel={level}
                profileXp={xp}
            />

            <VibeRoadmapStartModal
                visible={s.isStartModeOverlayOpen}
                roadmapLabel={s.roadmapRevealLabel || 'Your roadmap'}
                busy={s.busy}
                onStartAtBeginning={() => void s.handleStartModeSelection('beginning')}
                onTakePlacementTest={() => void s.handleStartModeSelection('placement')}
            />

            <VibeTaskFocusModal
                visible={Boolean(s.taskReveal)}
                topicTitle={s.taskReveal?.topicTitle || ''}
                skillTitle={s.taskReveal?.skillTitle || ''}
                domainTitle={s.taskReveal?.domainTitle}
                actionLabel={s.isFocusConfirm ? 'Get started' : 'Continue'}
                onComplete={s.isFocusConfirm ? () => void s.handleFocusConfirm() : () => s.setTaskReveal(null)}
            />

            {s.showQuizOverlay && s.quizOverlayQuestion ? (
                <VibeQuizModal
                    question={s.quizOverlayQuestion}
                    busy={s.busy}
                    submitting={s.quizSubmitting}
                    selectedIndex={s.overlaySelectedIndex}
                    nextReady={s.nextReady}
                    error={null}
                    outcomeFeedback={s.quizOutcomeFeedback}
                    onSelectIndex={s.handleQuizChoice}
                    onSubmit={() => void s.handleQuizSubmit()}
                    onNext={s.handleNextQuestion}
                    onOutcomeContinue={s.handleQuizFeedbackContinue}
                    onClose={s.dismissQuizOverlay}
                />
            ) : null}

            <AnimatePresence>
                {s.dashboardStubOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"
                        >
                            <button
                                type="button"
                                onClick={() => s.setDashboardStubOpen(false)}
                                className="absolute right-3 top-3 rounded-full p-2 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <h2 className="text-lg font-semibold text-zinc-100">Dashboard</h2>
                            <p className="mt-2 text-sm text-zinc-500">
                                Full dashboard is available on the classic chat. This focused view keeps attention on the conversation.
                            </p>
                            <Link
                                href="/chat"
                                className="mt-5 inline-flex w-full justify-center rounded-xl border border-white/15 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
                            >
                                Open classic chat
                            </Link>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {s.error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-5 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-red-500/30 bg-zinc-950/95 p-4 shadow-xl backdrop-blur-md"
                    >
                        <p className="text-sm font-medium text-red-400">Error</p>
                        <p className="mt-1 text-xs text-zinc-400">
                            {typeof s.error === 'string' ? s.error : 'Something went wrong.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => s.setError(null)}
                            className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
