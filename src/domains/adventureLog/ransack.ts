import { HOUR_IN_MS } from '@/api/ddoAudit'

/**
 * Reward-loot ransack: a chest (and the end-reward list of its quest) yields normal
 * loot for the first 8 loots within 7 days; the 9th is the first reduced one. The
 * wiki states it as "8 times per 7 days without ransack".
 * https://ddowiki.com/page/Chest_ransack
 *
 * Note this is not the quest XP ransack (a 20%-per-repeat penalty that decays 50%
 * every 18 hours); see .github/skills/ddo-ransack/SKILL.md.
 */
export const QUEST_RANSACK_WINDOW_MS = 7 * 24 * HOUR_IN_MS
export const QUEST_RANSACK_LIMIT = 8

export interface RansackStatus {
  runsInWindow: number
  ransacked: boolean
}

export function isWithinRansackWindow(iso: string, now: number = Date.now()): boolean {
  const timestamp = new Date(iso).getTime()
  return Number.isFinite(timestamp) && now - timestamp <= QUEST_RANSACK_WINDOW_MS
}

export function getRansackStatus(history: readonly string[], now: number = Date.now()): RansackStatus {
  const runsInWindow = history.filter((iso) => isWithinRansackWindow(iso, now)).length
  return { runsInWindow, ransacked: runsInWindow >= QUEST_RANSACK_LIMIT }
}
