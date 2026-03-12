'use client'

import { ChevronsRight, Radar, Shield, Sparkles, Target } from 'lucide-react'

import type { AgentRoadmapDomain, AgentRoadmapSkill, AgentSessionResponse } from '@/types'

interface RuntimePanelProps {
    session: AgentSessionResponse | null
    currentDomain: AgentRoadmapDomain | null
    currentSkill: AgentRoadmapSkill | null
    currentTopic: Record<string, unknown> | null
    collapsed?: boolean
    onToggleCollapse?: () => void
    className?: string
}

export function RuntimePanel({
    session,
    currentDomain,
    currentSkill,
    currentTopic,
    collapsed = false,
    onToggleCollapse,
    className,
}: RuntimePanelProps) {
    return (
        <aside
            className={`relative h-full overflow-hidden rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)] ${className ?? ''}`}
        >
            <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand runtime panel' : 'Collapse runtime panel'}
                className="absolute top-24 left-[-14px] z-20 flex h-12 w-7 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-2)] text-[color:var(--ink-soft)] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.8)] transition hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            >
                <ChevronsRight className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} />
            </button>

            <div className={`flex h-full flex-col transition ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="border-b border-[color:var(--line)] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Radar className="h-4 w-4 text-[color:var(--accent-2)]" />
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">Runtime State</h2>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--ink-faint)]">
                        Live context synced from the tutoring engine while you work.
                    </p>
                </div>

                <div className="space-y-4 overflow-y-auto p-4 text-sm text-[color:var(--ink)]">
                    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
                        <div className="flex items-center gap-2 text-[color:var(--ink-faint)]">
                            <Shield className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Status</span>
                        </div>
                        <p className="mt-2 font-semibold">{session?.status || 'idle'}</p>
                        <p className="mt-1 text-[color:var(--ink-faint)]">{session?.active_agent || 'No active agent yet'}</p>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
                        <div className="flex items-center gap-2 text-[color:var(--ink-faint)]">
                            <Target className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Current Domain</span>
                        </div>
                        <p className="mt-2 font-semibold">{currentDomain?.title || 'Not started'}</p>
                        <p className="mt-1 text-[color:var(--ink-faint)]">{currentDomain?.description || 'No domain selected yet.'}</p>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
                        <div className="flex items-center gap-2 text-[color:var(--ink-faint)]">
                            <Sparkles className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Current Skill</span>
                        </div>
                        <p className="mt-2 font-semibold">{currentSkill?.title || 'Waiting for calibration'}</p>
                        <p className="mt-1 text-[color:var(--ink-faint)]">
                            {currentSkill?.description || 'The knowledge agent will lock onto the frontier skill.'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
                        <div className="flex items-center gap-2 text-[color:var(--ink-faint)]">
                            <Radar className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Current Topic</span>
                        </div>
                        <p className="mt-2 font-semibold">
                            {String(currentTopic?.title || currentTopic?.objective || 'Lesson plan not generated yet')}
                        </p>
                        <p className="mt-1 text-[color:var(--ink-faint)]">
                            Topic index: {session?.state?.current_topic_index ?? 0} / {(session?.state?.lesson_plan || []).length || 0}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
