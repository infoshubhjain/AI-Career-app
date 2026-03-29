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
