'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Award, CheckCircle2, Zap, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export type MilestoneType = 'domain_complete' | 'skill_complete' | 'topic_complete' | 'quiz_perfect'

export interface MilestoneEvent {
  type: MilestoneType
  title: string
  xpGained: number
}

const MILESTONE_CONFIG: Record<MilestoneType, {
  icon: React.ElementType
  color: string
  glow: string
  label: string
}> = {
  domain_complete: {
    icon: Trophy,
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/40',
    label: 'Domain Complete',
  },
  skill_complete: {
    icon: Award,
    color: 'from-purple-500 to-pink-500',
    glow: 'shadow-purple-500/40',
    label: 'Skill Mastered',
  },
  topic_complete: {
    icon: CheckCircle2,
    color: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/30',
    label: 'Topic Complete',
  },
  quiz_perfect: {
    icon: Zap,
    color: 'from-blue-500 to-cyan-400',
    glow: 'shadow-blue-500/40',
    label: 'Perfect Score!',
  },
}

interface MilestoneToastProps {
  milestone: MilestoneEvent
  onClose: () => void
}

export function MilestoneToast({ milestone, onClose }: MilestoneToastProps) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const t = setTimeout(() => closeRef.current(), 4500)
    return () => clearTimeout(t)
  }, [])

  const config = MILESTONE_CONFIG[milestone.type]
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 320, damping: 25 }}
      className="flex items-center gap-3 w-full max-w-sm bg-neutral-900 border border-white/10 rounded-2xl p-3 shadow-2xl pr-4"
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shrink-0 shadow-lg ${config.glow}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">{config.label}</p>
        <p className="text-sm font-semibold text-white truncate">{milestone.title}</p>
      </div>

      {/* XP badge */}
      <div className={`shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-r ${config.color} text-white text-xs font-black`}>
        +{milestone.xpGained} XP
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-full text-white/30 hover:text-white/70 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

/** Stack of milestone toasts anchored to bottom-right */
interface MilestoneToastStackProps {
  milestones: (MilestoneEvent & { id: string })[]
  onDismiss: (id: string) => void
}

export function MilestoneToastStack({ milestones, onDismiss }: MilestoneToastStackProps) {
  return (
    <div className="fixed bottom-24 right-4 z-[90] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="sync">
        {milestones.map(m => (
          <div key={m.id} className="pointer-events-auto">
            <MilestoneToast milestone={m} onClose={() => onDismiss(m.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
