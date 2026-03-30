'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Star, X, Share2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface LevelUpModalProps {
  level: number
  onClose: () => void
}

const LEVEL_TITLES: Record<number, string> = {
  2: 'Apprentice',
  3: 'Learner',
  4: 'Explorer',
  5: 'Practitioner',
  6: 'Skilled',
  7: 'Adept',
  8: 'Expert',
  9: 'Master',
  10: 'Grandmaster',
}

function getLevelTitle(level: number) {
  return LEVEL_TITLES[level] ?? `Level ${level} Scholar`
}

/** Tiny particle that flies outward from the center */
function Particle({ index }: { index: number }) {
  const angle = (index / 12) * 360
  const distance = 80 + Math.random() * 60
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * distance
  const y = Math.sin(rad) * distance
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899']
  const color = colors[index % colors.length]
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: '50%', top: '50%' }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x, y, opacity: 0, scale: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 + index * 0.03 }}
    />
  )
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Auto-close after 6 seconds
  useEffect(() => {
    const t = setTimeout(() => closeRef.current(), 6000)
    return () => clearTimeout(t)
  }, [])

  const title = getLevelTitle(level)

  return (
    <AnimatePresence>
      <motion.div
        key="level-up-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="level-up-card"
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          onClick={e => e.stopPropagation()}
          className="relative w-[340px] mx-4 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-b from-neutral-900 to-neutral-950"
        >
          {/* Glow halo */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-60 bg-purple-600/20 blur-[80px] rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top badge */}
          <div className="pt-8 pb-4 flex flex-col items-center gap-1 relative">
            {/* Burst particles */}
            <div className="relative w-24 h-24">
              {Array.from({ length: 12 }).map((_, i) => (
                <Particle key={i} index={i} />
              ))}
              {/* Level badge circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 18 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.5)]"
              >
                <span className="text-3xl font-black text-white">{level}</span>
              </motion.div>
            </div>

            {/* Level-up label */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-[11px] font-bold uppercase tracking-[0.25em] text-purple-300 mt-2"
            >
              Level Up!
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="text-2xl font-black text-white"
            >
              {title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-neutral-400 px-6 text-center mt-1"
            >
              You've reached <span className="text-white font-semibold">Level {level}</span>. Keep pushing — more skills await.
            </motion.p>
          </div>

          {/* Stars row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="flex justify-center gap-2 pb-5"
          >
            {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5 + i * 0.07, type: 'spring', stiffness: 300 }}
              >
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </motion.div>
            ))}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="flex gap-2 px-5 pb-6"
          >
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Keep Learning
            </button>
            <button
              onClick={() => {
                const text = `🎉 Just reached Level ${level} — ${title} — on Career AI! 🚀`
                if (navigator.share) {
                  void navigator.share({ text })
                } else {
                  void navigator.clipboard.writeText(text)
                }
              }}
              className="px-3 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
              title="Share your achievement"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
