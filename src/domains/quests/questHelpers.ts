import { Quest } from '@/api/ddoAudit'

/**
 * Parses reaper skull count from LFM comment text.
 * Looks for patterns like "R10", "R 5", "Reaper1", "Reaper 3", etc.
 */
export function parseReaperSkulls(text: string | null): number | null {
  const s = String(text ?? '')
  if (!s) return null

  const re = /\b(?:r|reaper)\s*([1-9]|10)\b/gi
  let m
  let best = null
  while ((m = re.exec(s))) {
    const n = Number.parseInt(m[1], 10)
    if (!Number.isFinite(n)) continue
    best = best === null ? n : Math.max(best, n)
  }
  return best
}

/**
 * Determines if a quest is a raid based on its type.
 */
export function isRaidQuest(quest: Quest | null): boolean {
  const type = String(quest?.type ?? '').trim().toLowerCase()
  return type.includes('raid')
}

/**
 * Gets the effective level for an LFM/quest combination.
 * Takes into account heroic vs epic versions and leader level.
 */
export function getEffectiveLevel(lfm: { leader?: { total_level?: number }; maximum_level?: number; minimum_level?: number }, quest: Quest | null): number | null {
  const leaderLevel = lfm?.leader?.total_level
  const heroicLevel = quest?.heroicLevel
  const epicLevel = quest?.epicLevel

  if (typeof heroicLevel === 'number' && typeof epicLevel === 'number') {
    if (typeof leaderLevel === 'number' && leaderLevel >= 20) return epicLevel
    return heroicLevel
  }
  if (typeof epicLevel === 'number') return epicLevel
  if (typeof heroicLevel === 'number') return heroicLevel

  const questLevel = quest?.level
  if (typeof questLevel === 'number') return questLevel

  const max = lfm?.maximum_level
  if (typeof max === 'number') return max
  const min = lfm?.minimum_level
  if (typeof min === 'number') return min

  return null
}
