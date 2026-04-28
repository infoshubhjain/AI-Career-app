'use client'

import { motion } from 'framer-motion'

interface VibeRoadmapLoadingProps {
    visible: boolean
    query?: string
}

export function VibeRoadmapLoading({ visible, query }: VibeRoadmapLoadingProps) {
    if (!visible) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[50] flex items-center justify-center"
        >
            <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" />
            <div className="relative flex max-w-sm flex-col items-center px-6 text-center">
                <motion.div
                    className="h-16 w-16 rounded-full border-2 border-teal-400/20 border-t-teal-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="mt-6 text-sm font-medium text-zinc-200">Crafting your roadmap</p>
                {query ? <p className="mt-2 line-clamp-3 text-xs text-zinc-500">{query}</p> : null}
                <motion.div
                    className="mt-6 flex gap-1"
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {[0, 1, 2].map(i => (
                        <span key={i} className="h-1 w-8 rounded-full bg-gradient-to-r from-violet-500/50 to-teal-500/50" />
                    ))}
                </motion.div>
            </div>
        </motion.div>
    )
}
