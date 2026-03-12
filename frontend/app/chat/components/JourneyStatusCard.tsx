'use client'

import { BookOpen, BrainCircuit, ChevronRight, Layers3 } from 'lucide-react'

interface JourneyStatusCardProps {
    domainTitle: string
    skillTitle: string
    topicTitle: string
    domainProgressLabel: string
    skillProgressLabel: string
    topicProgressLabel: string
}

<<<<<<< HEAD
=======
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

>>>>>>> feature/chat_redesign
export function JourneyStatusCard({
    domainTitle,
    skillTitle,
    topicTitle,
    domainProgressLabel,
    skillProgressLabel,
    topicProgressLabel,
}: JourneyStatusCardProps) {
    return (
        <div className="flex items-center gap-1 flex-wrap text-xs overflow-hidden">
            <BreadcrumbItem icon={<Layers3 className="w-3 h-3" />} label={domainTitle} sub={domainProgressLabel} />
            <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
            <BreadcrumbItem icon={<BrainCircuit className="w-3 h-3" />} label={skillTitle} sub={skillProgressLabel} />
            <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-600 flex-shrink-0" />
            <BreadcrumbItem icon={<BookOpen className="w-3 h-3" />} label={topicTitle} sub={topicProgressLabel} />
        </div>
    )
}

function BreadcrumbItem({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
    return (
        <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-blue-500 dark:text-blue-400 flex-shrink-0">{icon}</span>
            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[120px] sm:max-w-[180px]">{label}</span>
            <span className="text-neutral-400 dark:text-neutral-500 flex-shrink-0">({sub})</span>
        </div>
    )
}
