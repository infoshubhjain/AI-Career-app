'use client'

import { motion } from 'framer-motion'

interface VibeXpPillProps {
    level: number
    xp: number
}

export function VibeXpPill({ level, xp }: VibeXpPillProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed left-5 top-[4.5rem] z-20 rounded-full border border-white/10 bg-zinc-950/60 px-3 py-1.5 text-[11px] font-medium tracking-wide text-zinc-300 shadow-lg backdrop-blur-md"
        >
            <span className="text-teal-300/90">Lv {level}</span>
            <span className="mx-2 text-white/20">·</span>
            <span className="text-zinc-400">{xp} XP</span>
        </motion.div>
    )
}
