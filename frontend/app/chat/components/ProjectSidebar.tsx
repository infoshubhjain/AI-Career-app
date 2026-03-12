'use client'

<<<<<<< HEAD
import { Trash2, MessageSquare } from 'lucide-react'
=======
import { FolderKanban, Plus, Trash2, ChevronsLeft } from 'lucide-react'

>>>>>>> feature/chat_redesign
import type { AgentProjectSummary } from '@/types'

interface ProjectSidebarProps {
    projects: AgentProjectSummary[]
    selectedProjectId: string | null
    busy: boolean
    onSelect: (projectId: string) => void
    onDelete: (projectId: string) => void
    onStartNew: () => void
<<<<<<< HEAD
    compact?: boolean
=======
    collapsed?: boolean
    onToggleCollapse?: () => void
    className?: string
>>>>>>> feature/chat_redesign
}

function timeAgo(value: string) {
    try {
        const diff = Date.now() - new Date(value).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d ago`
        return new Date(value).toLocaleDateString()
    } catch {
        return ''
    }
}

<<<<<<< HEAD
export function ProjectSidebar({ projects, selectedProjectId, busy, onSelect, onDelete, compact }: ProjectSidebarProps) {
    if (!compact) {
        // Legacy full-width layout (kept for backward compat)
        return (
            <aside className="rounded-[2rem] glass-premium dark:glass-premium-dark border border-white/30 dark:border-white/10 shadow-xl">
                <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto p-4">
                    {projects.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 p-2">No projects yet.</p>
                    ) : projects.map(project => (
                        <ProjectRow key={project.id} project={project} isSelected={selectedProjectId === project.id} busy={busy} onSelect={onSelect} onDelete={onDelete} />
                    ))}
                </div>
            </aside>
        )
    }

    // Compact thread-list style
    if (projects.length === 0) {
        return (
            <div className="px-2 py-4 text-center">
                <MessageSquare className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400 dark:text-neutral-500">No projects yet.<br />Start one above.</p>
=======
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
>>>>>>> feature/chat_redesign
            </div>
        )
    }

    return (
        <div className="space-y-0.5">
            <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Recent
            </p>
            {projects.map(project => (
                <ProjectRow
                    key={project.id}
                    project={project}
                    isSelected={selectedProjectId === project.id}
                    busy={busy}
                    onSelect={onSelect}
                    onDelete={onDelete}
                    compact
                />
            ))}
        </div>
    )
}

function ProjectRow({
    project,
    isSelected,
    busy,
    onSelect,
    onDelete,
    compact,
}: {
    project: AgentProjectSummary
    isSelected: boolean
    busy: boolean
    onSelect: (id: string) => void
    onDelete: (id: string) => void
    compact?: boolean
}) {
    if (compact) {
        return (
            <div className={`group relative flex items-center rounded-lg transition-colors ${
                isSelected
                    ? 'bg-blue-50 dark:bg-blue-500/10'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}>
                <button
                    onClick={() => onSelect(project.id)}
                    disabled={busy}
                    className="flex-1 min-w-0 px-3 py-2.5 text-left disabled:cursor-not-allowed"
                >
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {project.title}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
                        {timeAgo(project.updated_at)}
                    </p>
                </button>
                <button
                    onClick={e => { e.stopPropagation(); onDelete(project.id) }}
                    disabled={busy}
                    className="flex-shrink-0 mr-1.5 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:cursor-not-allowed"
                    aria-label={`Delete ${project.title}`}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    return (
        <div className={`group relative rounded-xl border transition ${
            isSelected ? 'border-blue-500/40 bg-blue-500/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-400/25'
        }`}>
            <button onClick={() => onSelect(project.id)} disabled={busy} className="w-full p-3 pr-10 text-left disabled:cursor-not-allowed">
                <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{project.title}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">{project.goal}</p>
                <p className="mt-1.5 text-[10px] text-neutral-400">{timeAgo(project.updated_at)}</p>
            </button>
            <button
                onClick={e => { e.stopPropagation(); onDelete(project.id) }}
                disabled={busy}
                className="absolute right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
