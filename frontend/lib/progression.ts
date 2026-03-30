/**
 * Client-side XP / level utilities (no server imports).
 * The server-side version lives at lib/supabase/progression-service.ts.
 */

const XP_LEVEL_BASE = 100
const XP_SCALING_FACTOR = 1.1

export const XP_REWARDS = {
  MESSAGE_SENT: 1,
  TOPIC_COMPLETE: 20,
  QUIZ_CORRECT: 30,
  SKILL_COMPLETE: 60,
  DOMAIN_COMPLETE: 150,
} as const

export type XPRewardKey = keyof typeof XP_REWARDS

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0
  let total = 0
  for (let i = 1; i < level; i++) {
    total += Math.floor(XP_LEVEL_BASE * Math.pow(XP_SCALING_FACTOR, i - 1))
  }
  return total
}

export function getLevelFromXP(xp: number): number {
  let level = 1
  while (getXPForLevel(level + 1) <= xp) level++
  return level
}

/** Returns { newXP, newLevel, leveledUp, gainedLevels } */
export function applyXPGain(currentXP: number, gain: number) {
  const oldLevel = getLevelFromXP(currentXP)
  const newXP = currentXP + gain
  const newLevel = getLevelFromXP(newXP)
  return {
    newXP,
    newLevel,
    leveledUp: newLevel > oldLevel,
    gainedLevels: newLevel - oldLevel,
  }
}
