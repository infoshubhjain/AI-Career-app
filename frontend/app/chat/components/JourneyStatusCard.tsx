'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, BrainCircuit, Layers3 } from 'lucide-react'

interface JourneyStatusCardProps {
    domainTitle: string
    skillTitle: string
    topicTitle: string
    domainProgressLabel: string
    skillProgressLabel: string
    topicProgressLabel: string
}

function ProgressRow({
    icon,
    label,
    value,
    subtitle,
}: {
    icon: ReactNode
    label: string
    value: string
    subtitle: string
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4"
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-[color:var(--line-strong)] bg-[color:var(--surface)] p-2 text-[color:var(--accent)]">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">{label}</p>
                    <p className="mt-1 truncate text-base font-semibold text-[color:var(--ink)]">{value}</p>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{subtitle}</p>
                </div>
            </div>
        </motion.div>
    )
}

export function JourneyStatusCard({
    domainTitle,
    skillTitle,
    topicTitle,
    domainProgressLabel,
    skillProgressLabel,
    topicProgressLabel,
}: JourneyStatusCardProps) {
    return (
        <div className="grid gap-3 md:grid-cols-3">
            <ProgressRow icon={<Layers3 className="h-4 w-4" />} label="Domain" value={domainTitle} subtitle={domainProgressLabel} />
            <ProgressRow icon={<BrainCircuit className="h-4 w-4" />} label="Skill" value={skillTitle} subtitle={skillProgressLabel} />
            <ProgressRow icon={<BookOpen className="h-4 w-4" />} label="Topic" value={topicTitle} subtitle={topicProgressLabel} />
        </div>
    )
}
