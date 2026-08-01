import { Quest } from '@/api/ddoAudit'

export interface QuestVersion {
  name: string
  level: number
  type: string | null
  quest: Quest | null
}

interface QuestVersionCandidate {
  baseName: string
  level: number
  tierLabel: string | null
  type: string | null
  quest: Quest | null
  matchPriority: number
}

function getQuestTierLabel(level: number): string | null {
  if (level >= 30) return 'Legendary'
  if (level >= 20) return 'Epic'
  return 'Heroic'
}

function buildQuestVersionCandidates(quest: Quest, locationId: string): QuestVersionCandidate[] {
  const matchPriority = quest.id === locationId ? 2 : 1

  if (
    typeof quest.heroicLevel === 'number'
    && typeof quest.epicLevel === 'number'
    && quest.heroicLevel !== quest.epicLevel
  ) {
    return [
      {
        baseName: quest.name,
        level: quest.heroicLevel,
        tierLabel: 'Heroic',
        type: quest.type,
        quest,
        matchPriority,
      },
      {
        baseName: quest.name,
        level: quest.epicLevel,
        tierLabel: getQuestTierLabel(quest.epicLevel),
        type: quest.type,
        quest,
        matchPriority,
      },
    ]
  }

  const level = Math.max(quest.heroicLevel ?? 0, quest.epicLevel ?? 0, quest.level ?? 0)
  return [{
    baseName: quest.name,
    level,
    tierLabel: level > 0 ? (typeof quest.heroicLevel === 'number' ? 'Heroic' : getQuestTierLabel(level)) : null,
    type: quest.type,
    quest,
    matchPriority,
  }]
}

function buildQuestVersionName(candidate: QuestVersionCandidate, needsSuffix: boolean): string {
  if (!needsSuffix) return candidate.baseName
  if (candidate.tierLabel) return `${candidate.baseName} (${candidate.tierLabel})`
  return `${candidate.baseName} (Level ${candidate.level})`
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
  const matchedQuests = new Set<Quest>()

  for (const quest of Object.values(quests)) {
    if (quest.id === locationId || quest.areaId === locationId) {
      matchedQuests.add(quest)
    }
  }

  if (matchedQuests.size === 0) {
    const fallback = quests[locationId]
    return fallback ? [{
      name: fallback.name,
      level: Math.max(fallback.heroicLevel ?? 0, fallback.epicLevel ?? 0, fallback.level ?? 0),
      type: fallback.type,
      quest: fallback,
    }] : []
  }

  const candidates = Array.from(matchedQuests).flatMap((quest) => buildQuestVersionCandidates(quest, locationId))
  const candidateCounts = new Map<string, number>()
  for (const candidate of candidates) {
    candidateCounts.set(candidate.baseName, (candidateCounts.get(candidate.baseName) || 0) + 1)
  }

  const versionsByKey = new Map<string, QuestVersionCandidate & { name: string }>()
  for (const candidate of candidates) {
    const name = buildQuestVersionName(candidate, (candidateCounts.get(candidate.baseName) || 0) > 1)
    const key = `${name}|${candidate.level}`
    const existing = versionsByKey.get(key)
    if (!existing || candidate.matchPriority > existing.matchPriority) {
      versionsByKey.set(key, { ...candidate, name })
    }
  }

  return Array.from(versionsByKey.values())
    .map(({ name, level, type, quest }) => ({ name, level, type, quest }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
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
    if (
      diff < minDiff
      || (
        diff === minDiff
        && (
          (characterLevel >= 20 && version.level > bestVersion.level)
          || (characterLevel < 20 && version.level < bestVersion.level)
        )
      )
    ) {
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
