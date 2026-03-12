'use client'

import { type RefObject } from 'react'
import { motion } from 'framer-motion'
import { Bot, ChevronRight, Radar, Send, User as UserIcon } from 'lucide-react'

import { JourneyStatusCard } from './JourneyStatusCard'
import { MarkdownRenderer } from './MarkdownRenderer'
import { RoadmapCreationCanvas } from './RoadmapCreationCanvas'
import type { AgentQuestion, AgentRoadmapDomain, AgentRoadmapSkill, AgentSessionResponse } from '@/types'

type TimelineMessage = {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt: string
    variant?: 'ambition' | 'standard'
}

interface ChatSurfaceProps {
    session: AgentSessionResponse | null
    selectedProjectId: string | null
    currentDomain: AgentRoadmapDomain | null
    currentSkill: AgentRoadmapSkill | null
    currentTopic: Record<string, unknown> | null
    isEntryMode: boolean
    isLearningMode: boolean
    totalDomains: number
    currentDomainIndex: number
    totalSkillsInDomain: number
    currentSkillIndex: number
    totalTopics: number
    messages: TimelineMessage[]
    messagesEndRef: RefObject<HTMLDivElement>
    pendingQuestion: AgentQuestion | null
    isQuizOverlayOpen: boolean
    isStartModeOverlayOpen: boolean
    busy: boolean
    input: string
    inputPlaceholder: string
    roadmapCreationQuery: string
    isRoadmapLoading: boolean
    onInputChange: (value: string) => void
    onSubmit: (event: React.FormEvent) => void
    onReopenQuizOverlay: () => void
    onBeginNewProject: () => void
}

export function ChatSurface({
    session,
    selectedProjectId,
    currentDomain,
    currentSkill,
    currentTopic,
    isEntryMode,
    isLearningMode,
    totalDomains,
    currentDomainIndex,
    totalSkillsInDomain,
    currentSkillIndex,
    totalTopics,
    messages,
    messagesEndRef,
    pendingQuestion,
    isQuizOverlayOpen,
    isStartModeOverlayOpen,
    busy,
    input,
    inputPlaceholder,
    roadmapCreationQuery,
    isRoadmapLoading,
    onInputChange,
    onSubmit,
    onReopenQuizOverlay,
    onBeginNewProject,
}: ChatSurfaceProps) {
    return (
        <section className="relative mt-6 flex flex-1 flex-col overflow-hidden rounded-[2.25rem] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_40px_120px_-80px_rgba(0,0,0,0.9)]">
            <RoadmapCreationCanvas visible={isRoadmapLoading} ambition={roadmapCreationQuery} />

            <div className="border-b border-[color:var(--line)] px-6 py-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                    <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 py-1 text-[color:var(--ink-faint)]">
                        {session?.active_agent || 'orchestrator'}
                    </span>
                    <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 py-1 text-[color:var(--ink-faint)]">
                        {currentDomain?.title || (selectedProjectId ? 'Project loaded' : 'No project selected')}
                    </span>
                    {currentSkill ? (
                        <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 py-1 text-[color:var(--ink-faint)]">
                            {currentSkill.title}
                        </span>
                    ) : null}
                </div>
                <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
                    {isEntryMode
                        ? 'Describe your ambition to generate a roadmap, trace your current knowledge, and unlock the guided lecture flow.'
                        : 'Your workspace stores roadmaps, quizzes, adaptive knowledge state, and full transcript history.'}
                </p>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                {isLearningMode ? (
                    <JourneyStatusCard
                        domainTitle={currentDomain?.title || 'Roadmap loading'}
                        skillTitle={currentSkill?.title || 'Knowledge tracing in progress'}
                        topicTitle={String(currentTopic?.title || currentTopic?.objective || 'Lecture unlocks after tracing')}
                        domainProgressLabel={totalDomains > 0 ? `Domain ${Math.min(currentDomainIndex + 1, totalDomains)} of ${totalDomains}` : 'Preparing your roadmap'}
                        skillProgressLabel={totalSkillsInDomain > 0 ? `Skill ${Math.min(currentSkillIndex + 1, totalSkillsInDomain)} of ${totalSkillsInDomain} in this domain` : 'Waiting for current skill'}
                        topicProgressLabel={totalTopics > 0 ? `Topic ${Math.min((session?.state?.current_topic_index ?? 0) + 1, totalTopics)} of ${totalTopics}` : 'No topic lecture yet'}
                    />
                ) : null}

                {messages.length === 0 ? (
                    <div className="mx-auto flex min-h-[360px] max-w-lg flex-col items-center justify-center text-center">
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)]">
                            <Radar className="h-6 w-6 text-[color:var(--accent)]" />
                        </div>
                        <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            Describe your ambition
                        </h2>
                        <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
                            Tell the tutor what you want to become or build. We will generate the roadmap, reveal the selected track, calibrate your level, and then begin the lecture.
                        </p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: index * 0.02 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[92%] gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--line-strong)] text-[color:var(--ink)] ${
                                        message.role === 'user'
                                            ? 'bg-[color:var(--surface-2)]'
                                            : message.role === 'system'
                                              ? 'bg-[color:var(--accent)]'
                                              : 'bg-[color:var(--surface)]'
                                    }`}
                                >
                                    {message.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div
                                    className={`rounded-2xl border px-5 py-3.5 text-[15px] leading-relaxed shadow-[0_18px_40px_-32px_rgba(0,0,0,0.9)] ${
                                        message.role === 'user'
                                            ? message.variant === 'ambition'
                                                ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--ink)]'
                                                : 'border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--ink)]'
                                            : 'border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--ink)]'
                                    }`}
                                >
                                    <div className="markdown-body">
                                        <MarkdownRenderer content={message.content} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[color:var(--line)] bg-[color:var(--surface)] px-5 py-4">
                {pendingQuestion && !isQuizOverlayOpen ? (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--accent)] bg-[color:var(--accent)] px-4 py-3 text-sm text-[#1c160a]">
                        <div>
                            <p className="font-semibold">Quiz paused</p>
                            <p className="mt-1 text-[#1c160a]/70">
                                This project is still waiting on a quiz answer before the session can continue.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onReopenQuizOverlay}
                            disabled={busy}
                            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--ink)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Continue Quiz
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                ) : null}

                <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
                    <input
                        value={input}
                        onChange={event => onInputChange(event.target.value)}
                        placeholder={inputPlaceholder}
                        disabled={isStartModeOverlayOpen || Boolean(pendingQuestion) || busy}
                        className="min-h-[52px] flex-1 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] px-4 text-sm font-medium text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isStartModeOverlayOpen || busy || Boolean(pendingQuestion)}
                        className="inline-flex h-[52px] items-center justify-center rounded-2xl bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] px-6 text-sm font-semibold text-[#1c160a] shadow-[0_18px_50px_-32px_rgba(0,0,0,0.9)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--ink-faint)]">
                    <span>{busy ? 'Waiting for backend orchestration...' : 'Ready for the next turn.'}</span>
                    <button
                        onClick={onBeginNewProject}
                        className="font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
                    >
                        Start New Project
                    </button>
                </div>
            </div>
        </section>
    )
}
