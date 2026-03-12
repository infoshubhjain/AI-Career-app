'use client'

import { FolderKanban, Plus, Trash2, ChevronsLeft } from 'lucide-react'

import type { AgentProjectSummary } from '@/types'

interface ProjectSidebarProps {
    projects: AgentProjectSummary[]
    selectedProjectId: string | null
    busy: boolean
    onSelect: (projectId: string) => void
    onDelete: (projectId: string) => void
    onStartNew: () => void
    collapsed?: boolean
    onToggleCollapse?: () => void
    className?: string
}

function formatTimestamp(value: string) {
    try {
        return new Date(value).toLocaleString()
    } catch {
        return value
    }
}

export function ProjectSidebar({
    projects,
    selectedProjectId,
    busy,
    onSelect,
    onDelete,
    onStartNew,
    collapsed = false,
    onToggleCollapse,
    className,
}: ProjectSidebarProps) {
    return (
        <aside
            className={`relative h-full overflow-hidden rounded-[1.75rem] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.9)] ${className ?? ''}`}
        >
            <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand projects panel' : 'Collapse projects panel'}
                className="absolute top-24 right-[-14px] z-20 flex h-12 w-7 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-2)] text-[color:var(--ink-soft)] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.8)] transition hover:text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            >
                <ChevronsLeft className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} />
            </button>

            <div className={`flex h-full flex-col transition ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="border-b border-[color:var(--line)] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-[color:var(--accent)]" />
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">Projects</h2>
                        </div>
                        <button
                            onClick={onStartNew}
                            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line-strong)] bg-[color:var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)] transition hover:border-[color:var(--accent)]"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New
                        </button>
                    </div>
                    <p className="mt-3 text-sm text-[color:var(--ink-faint)]">
                        Every new roadmap query creates a project. Select one to reopen its latest tutoring session.
                    </p>
                </div>

                <div className="max-h-[calc(100vh-260px)] space-y-3 overflow-y-auto p-4">
                    {projects.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-2)] p-4 text-sm text-[color:var(--ink-faint)]">
                            No projects yet. Start a new one from the button above.
                        </div>
                    ) : (
                        projects.map(project => {
                            const isSelected = selectedProjectId === project.id
                            return (
                                <div
                                    key={project.id}
                                    className={`group relative rounded-2xl border transition ${
                                        isSelected
                                            ? 'border-[color:var(--accent)] bg-[color:var(--surface-2)]'
                                            : 'border-[color:var(--line)] bg-[color:var(--surface-2)] hover:border-[color:var(--accent)]'
                                    }`}
                                >
                                    <button
                                        onClick={() => onSelect(project.id)}
                                        disabled={busy}
                                        className="w-full rounded-2xl p-4 pr-12 text-left text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">{project.title}</p>
                                                <p className="mt-2 text-sm text-[color:var(--ink-soft)]">{project.goal}</p>
                                            </div>
                                            <span className="rounded-full border border-[color:var(--line-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                                                {project.status}
                                            </span>
                                        </div>
                                        <p className="mt-3 text-[11px] text-[color:var(--ink-faint)]">
                                            Updated {formatTimestamp(project.updated_at)}
                                        </p>
                                    </button>

                                    <button
                                        onClick={event => {
                                            event.stopPropagation()
                                            onDelete(project.id)
                                        }}
                                        disabled={busy}
                                        aria-label={`Delete ${project.title}`}
                                        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </aside>
    )
}
