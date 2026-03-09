'use client'

import { FolderKanban, Plus, Trash2 } from 'lucide-react'

import type { AgentProjectSummary } from '@/types'

interface ProjectSidebarProps {
    projects: AgentProjectSummary[]
    selectedProjectId: string | null
    busy: boolean
    onSelect: (projectId: string) => void
    onDelete: (projectId: string) => void
    onStartNew: () => void
}

function formatTimestamp(value: string) {
    try {
        return new Date(value).toLocaleString()
    } catch {
        return value
    }
}

export function ProjectSidebar({ projects, selectedProjectId, busy, onSelect, onDelete, onStartNew }: ProjectSidebarProps) {
    return (
        <aside className="rounded-[2rem] glass-premium dark:glass-premium-dark border border-white/30 dark:border-white/10 shadow-xl">
            <div className="border-b border-white/20 dark:border-white/10 p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-900 dark:text-white">Projects</h2>
                    </div>
                    <button
                        onClick={onStartNew}
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-lg"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </button>
                </div>
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
                    Every new roadmap query creates a project. Select one to reopen its latest tutoring session.
                </p>
            </div>

            <div className="max-h-[calc(100vh-260px)] space-y-3 overflow-y-auto p-4">
                {projects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 dark:border-white/10 bg-white/40 dark:bg-neutral-900/40 p-4 text-sm text-neutral-600 dark:text-neutral-300">
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
                                        ? 'border-blue-500/40 bg-blue-500/10'
                                        : 'border-white/20 dark:border-white/10 bg-white/50 dark:bg-neutral-900/50 hover:border-blue-400/25'
                                }`}
                            >
                                <button
                                    onClick={() => onSelect(project.id)}
                                    disabled={busy}
                                    className="w-full rounded-2xl p-4 pr-12 text-left disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-neutral-900 dark:text-white">{project.title}</p>
                                            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{project.goal}</p>
                                        </div>
                                        <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600 dark:text-neutral-300">
                                            {project.status}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
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
                                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>
        </aside>
    )
}
