'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PlusCircle, X } from 'lucide-react'

import { ProjectSidebar } from '@/app/chat/components/ProjectSidebar'
import type { AgentProjectSummary } from '@/types'

interface VibeProjectsDrawerProps {
    open: boolean
    onClose: () => void
    projects: AgentProjectSummary[]
    selectedProjectId: string | null
    busy: boolean
    onSelect: (id: string) => void
    onDelete: (id: string) => void
    onStartNew: () => void
    profileLevel: number
    profileXp: number
}

export function VibeProjectsDrawer({
    open,
    onClose,
    projects,
    selectedProjectId,
    busy,
    onSelect,
    onDelete,
    onStartNew,
    profileLevel,
    profileXp,
}: VibeProjectsDrawerProps) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close drawer"
                        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.aside
                        role="dialog"
                        aria-modal="true"
                        aria-label="Projects"
                        className="fixed inset-y-0 left-0 z-[70] flex w-[min(100%,20rem)] flex-col border-r border-amber-950/40 bg-gradient-to-b from-amber-950 via-stone-900 to-stone-950 shadow-2xl"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">Workspace</p>
                                <p className="text-sm font-medium text-stone-100">Projects</p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full p-2 text-stone-400 transition hover:bg-white/10 hover:text-stone-100"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="border-b border-white/10 px-4 py-3">
                            <p className="text-[11px] text-stone-400">
                                Level <span className="font-semibold text-amber-200">{profileLevel}</span>
                                <span className="mx-1.5 text-stone-600">·</span>
                                <span className="text-stone-300">{profileXp} XP</span>
                            </p>
                        </div>
                        <div className="px-3 py-3">
                            <button
                                type="button"
                                onClick={onStartNew}
                                disabled={busy}
                                className="flex w-full items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                            >
                                <PlusCircle className="h-4 w-4" />
                                New project
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
                            <ProjectSidebar
                                projects={projects}
                                selectedProjectId={selectedProjectId}
                                busy={busy}
                                onSelect={onSelect}
                                onDelete={onDelete}
                                onStartNew={onStartNew}
                                compact
                            />
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )
}
