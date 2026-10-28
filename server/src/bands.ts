import type { QuestRecord } from './ddo.js'

export type QuestBand = 'heroic' | 'epic' | 'legendary'

export interface QuestVersion {
  band: QuestBand
  level: number
}

/**
 * Playable versions of a quest. The upstream record carries a heroic CR, an epic CR,
 * or both; an epic CR of 30+ is what DDO calls legendary.
 */
export function questVersions(quest: QuestRecord): QuestVersion[] {
  // Challenge "- EPIC" records carry the same heroic and epic CR; that is a single
  // epic version, so a run must not be filed as heroic.
  if (quest.heroicCr !== null && quest.epicCr !== null && quest.heroicCr === quest.epicCr) {
    return [{ band: quest.epicCr >= 30 ? 'legendary' : 'epic', level: quest.epicCr }]
  }

  const versions: QuestVersion[] = []
  if (quest.heroicCr !== null) versions.push({ band: 'heroic', level: quest.heroicCr })
  if (quest.epicCr !== null) {
    versions.push({ band: quest.epicCr >= 30 ? 'legendary' : 'epic', level: quest.epicCr })
  }
  return versions
}

/**
 * Which version a run belongs to, picked by the nearest version level. Same rule the
 * area resolver uses, so the row the character ran is the row that gets written.
 */
export function bandForLevel(quest: QuestRecord, level: number | null): QuestBand {
  const versions = questVersions(quest)
  if (versions.length === 0) return 'heroic'
  if (level === null) return versions[0].band

  return [...versions].sort((left, right) => Math.abs(left.level - level) - Math.abs(right.level - level))[0]
    .band
}

export function isQuestBand(value: string): value is QuestBand {
  return value === 'heroic' || value === 'epic' || value === 'legendary'
}
