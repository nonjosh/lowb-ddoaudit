import { HOUR_IN_MS } from '@/api/ddoAudit'

/**
 * Reward-loot ransack (https://ddowiki.com/page/Chest_ransack).
 *
 * The game starts a fixed 168h timer on the first loot of a chest (and its quest's
 * end-reward list). Loot 1-8 inside that timer are normal; the 9th is the first
 * reduced one (ransack warning, no named items). Later loots do NOT extend the timer
 * — when it runs out the chest is fully normal again.
 *
 * This is not quest XP ransack (a stacking -20% XP per repeat that decays 50% per
 * 18h); see .github/skills/ddo-ransack/SKILL.md.
 */
export const QUEST_RANSACK_WINDOW_MS = 7 * 24 * HOUR_IN_MS
/** Normal loots allowed per timer period; the next one is ransacked. */
export const QUEST_RANSACK_LIMIT = 8
/** Mirrors HISTORY_LIMIT in server/src/store.ts: older entries are pruned. */
export const HISTORY_CAP = 10

export interface RansackStatus {
  /** Loots counted inside the current timer period. */
  runsInWindow: number
  /** True from the 9th loot of the period. */
  ransacked: boolean
  /** End of the current timer period, or null when no period is running. */
  resetsAt: Date | null
  /** Start of the current timer period, used to highlight the counted loots. */
  windowStart: Date | null
  /** True when the stored history hit the cap, so the period start may be later than reality. */
  truncated: boolean
}

export function isWithinRansackWindow(iso: string, now: number = Date.now()): boolean {
  const timestamp = new Date(iso).getTime()
  return Number.isFinite(timestamp) && now - timestamp <= QUEST_RANSACK_WINDOW_MS
}

/**
 * `since` is the last reincarnation: loots from a previous life do not count towards
 * the current life's timer.
 */
export function getRansackStatus(
  history: readonly string[],
  now: number = Date.now(),
  since: string | null = null,
): RansackStatus {
  const lifeStart = since === null ? null : new Date(since).getTime()

  const times = history
    .map((iso) => new Date(iso).getTime())
    .filter((timestamp) => Number.isFinite(timestamp))
    .filter((timestamp) => lifeStart === null || !Number.isFinite(lifeStart) || timestamp >= lifeStart)
    .sort((left, right) => left - right)

  const truncated = history.length >= HISTORY_CAP
  if (times.length === 0) {
    return { runsInWindow: 0, ransacked: false, resetsAt: null, windowStart: null, truncated }
  }

  // A loot at or after start+window begins a new period instead of extending the old one.
  let start = times[0]
  let runs = 0
  for (const timestamp of times) {
    if (timestamp >= start + QUEST_RANSACK_WINDOW_MS) {
      start = timestamp
      runs = 0
    }
    runs += 1
  }

  const resetsAt = start + QUEST_RANSACK_WINDOW_MS
  if (now >= resetsAt) {
    return { runsInWindow: 0, ransacked: false, resetsAt: null, windowStart: null, truncated }
  }

  return {
    runsInWindow: runs,
    ransacked: runs > QUEST_RANSACK_LIMIT,
    resetsAt: new Date(resetsAt),
    windowStart: new Date(start),
    truncated,
  }
}
