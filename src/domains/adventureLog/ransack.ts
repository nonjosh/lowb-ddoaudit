import { HOUR_IN_MS } from '@/api/ddoAudit'

/**
 * Quest end-reward ransack: repeating a quest too often within the window degrades
 * the end reward list. The wiki describes the window in days and the count in runs;
 * these two constants are the only place to adjust if the game changes.
 * See .github/skills/ddo-ransack/SKILL.md for the chest version of the mechanic.
 */
export const QUEST_RANSACK_WINDOW_MS = 7 * 24 * HOUR_IN_MS
export const QUEST_RANSACK_LIMIT = 5

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
