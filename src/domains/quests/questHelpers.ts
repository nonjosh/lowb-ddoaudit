import { Quest } from '@/api/ddoAudit'

export interface QuestVersion {
  name: string
  level: number
  type: string | null
  quest: Quest | null
}

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
 * Builds a Set of quest names that are raids from a questsById record.
 */
export function buildRaidQuestNames(questsById: Record<string, Quest>): Set<string> {
  const names = new Set<string>()
  for (const q of Object.values(questsById)) {
    if (isRaidQuest(q)) names.add(q.name)
  }
  return names
}

/**
 * Returns all quest variants that share a location id.
 * Some DDO Audit raids expose heroic and legendary versions as separate quest
 * records with the same area id, so a direct map lookup can pick the wrong one.
 */
export function getQuestVersionsForLocation(locationId: string, quests: Record<string, Quest>): QuestVersion[] {
  const versions: QuestVersion[] = []
  const seenNames = new Set<string>()
  const matchedQuests = new Set<Quest>()

  for (const quest of Object.values(quests)) {
    if (quest.id === locationId || quest.areaId === locationId) {
      matchedQuests.add(quest)
    }
  }

  if (matchedQuests.size === 0) {
    const fallback = quests[locationId]
    if (fallback) {
      versions.push({
        name: fallback.name,
        level: Math.max(fallback.heroicLevel ?? 0, fallback.epicLevel ?? 0, fallback.level ?? 0),
        type: fallback.type,
        quest: fallback,
      })
    }
    return versions
  }

  for (const quest of matchedQuests) {
    if (
      typeof quest.heroicLevel === 'number'
      && typeof quest.epicLevel === 'number'
      && quest.heroicLevel !== quest.epicLevel
    ) {
      const heroicName = `${quest.name} (Heroic)`
      const epicLabel = quest.epicLevel >= 30 ? 'Legendary' : 'Epic'
      const epicName = `${quest.name} (${epicLabel})`

      if (!seenNames.has(heroicName)) {
        seenNames.add(heroicName)
        versions.push({
          name: heroicName,
          level: quest.heroicLevel,
          type: quest.type,
          quest,
        })
      }

      if (!seenNames.has(epicName)) {
        seenNames.add(epicName)
        versions.push({
          name: epicName,
          level: quest.epicLevel,
          type: quest.type,
          quest,
        })
      }

      continue
    }

    const level = Math.max(quest.heroicLevel ?? 0, quest.epicLevel ?? 0, quest.level ?? 0)
    if (!seenNames.has(quest.name)) {
      seenNames.add(quest.name)
      versions.push({
        name: quest.name,
        level,
        type: quest.type,
        quest,
      })
    }
  }

  return versions.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

export function getBestQuestVersionForLevel(
  locationId: string,
  quests: Record<string, Quest>,
  characterLevel: number | null | undefined,
): QuestVersion | null {
  const versions = getQuestVersionsForLocation(locationId, quests)
  if (versions.length === 0) return null
  if (versions.length === 1 || typeof characterLevel !== 'number') return versions[0]

  let bestVersion = versions[0]
  let minDiff = Infinity

  for (const version of versions) {
    const diff = Math.abs(characterLevel - version.level)
    if (diff < minDiff) {
      bestVersion = version
      minDiff = diff
    }
  }

  return bestVersion
}

/**
 * Returns true if the item can only be obtained from raid quests.
 * Requires item.quests to be non-empty and every quest to be in the raidQuestNames set.
 */
export function isRaidItem(
  item: { quests?: string[] },
  raidQuestNames: Set<string>,
): boolean {
  if (!item.quests || item.quests.length === 0) return false
  return item.quests.every((qName) => raidQuestNames.has(qName))
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
