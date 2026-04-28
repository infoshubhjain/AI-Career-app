'use client'

import Link from 'next/link'
import { LayoutDashboard, Menu, Sparkles } from 'lucide-react'

interface VibeCornerControlsProps {
    onOpenDrawer: () => void
    onOpenDashboardStub: () => void
}

export function VibeCornerControls({ onOpenDrawer, onOpenDashboardStub }: VibeCornerControlsProps) {
    return (
        <>
            <button
                type="button"
                onClick={onOpenDrawer}
                className="fixed left-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/50 text-zinc-200 shadow-lg backdrop-blur-md transition hover:border-teal-400/30 hover:bg-zinc-900/70 hover:text-white"
                aria-label="Open projects"
            >
                <Menu className="h-5 w-5" />
            </button>
            <Link
                href="/"
                className="fixed right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/50 text-zinc-200 shadow-lg backdrop-blur-md transition hover:border-violet-400/30 hover:bg-zinc-900/70 hover:text-white"
                aria-label="Home"
            >
                <Sparkles className="h-5 w-5" />
            </Link>
            <button
                type="button"
                onClick={onOpenDashboardStub}
                className="fixed bottom-5 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/50 text-zinc-200 shadow-lg backdrop-blur-md transition hover:border-violet-400/30 hover:bg-zinc-900/70 hover:text-white"
                aria-label="Dashboard"
            >
                <LayoutDashboard className="h-5 w-5" />
            </button>
        </>
    )
}
