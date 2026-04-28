'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface FloatingConversationCardProps {
    children: ReactNode
    className?: string
}

export function FloatingConversationCard({ children, className = '' }: FloatingConversationCardProps) {
    return (
        <motion.div
            className={`relative z-10 mx-auto flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden overflow-x-hidden rounded-[1.75rem] border border-white/[0.08] bg-zinc-950/55 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl ${className}`}
            initial={{ opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
                y: -4,
                boxShadow: '0 32px 100px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07) inset',
            }}
        >
            <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-b from-white/[0.06] to-transparent" />
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">{children}</div>
        </motion.div>
    )
}
