import type { Quest } from '@/api/ddoAudit'

import { CharacterClass, isEntryAvailable, RaidEntry, RaidGroup } from './raidLogic'

/**
 * Common abbreviations / short forms used in LFM comments when
 * referring to raid trains. Keys are lowercase. Values are lowercase
 * substrings that should match against the full quest name.
 */
const RAID_ABBREVIATIONS: Record<string, string> = {
  dov: 'den of vipers',
  threats: 'threats old and new',
  toan: 'threats old and new',
  ton: 'threats old and new',
  todl: 'temple of the deathwyrm',
  rel: 'relentless',
  fom: 'fire over morgrave',
  ma: 'master artificer',
  lob: 'lord of blades',
  vod: 'vision of destruction',
  thth: 'too hot to handle',
  baba: "old baba's hut",
  kt: 'killing time',
  strahd: 'curse of strahd',
  drya: 'dryad and the demigod',
  dryad: 'dryad and the demigod',
  driad: 'dryad and the demigod',
  demigod: 'dryad and the demigod',
  esos: 'enemy of my enemy',
  eome: 'enemy of my enemy',
  tempest: "tempest's spine",
  mark: 'mark of death',
  mod: 'mark of death',
  ascension: 'ascension chamber',
  fire: 'fire over morgrave',
  riding: 'riding the storm out',
  rtso: 'riding the storm out',
  shroud: 'the shroud',
  reaper: 'project nemesis',
  nemesis: 'project nemesis',
  cog: 'caught in the web',
  citw: 'caught in the web',
  defiler: 'the lord of stone and bone',
  lsb: 'the lord of stone and bone',
  kor: 'the curse of strahd',
  csw: 'caught in the web',
  skelly: 'skeletons in the closet',
  skellys: 'skeletons in the closet',
  skellies: 'skeletons in the closet',
  sitc: 'skeletons in the closet',
  hunt: 'hunt or be hunted',
  'fall of truth': 'fall of truth',
  fot: 'fall of truth',
}

function normalizeRaidSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * True when two raid names are the heroic/legendary versions of the same raid,
 * e.g. "A Vision of Destruction" and "Legendary Vision of Destruction".
 */
export function isSameRaidTierVariant(nameA: string, nameB: string): boolean {
  const core = (name: string) =>
    normalizeRaidSearchText(name)
      .replace(/^(?:(?:the|a|an|legendary)\s+)+/, '')
      .replace(/\s+legendary$/, '')
  return core(nameA) === core(nameB)
}

function buildRaidNameCandidates(raidName: string): Set<string> {
  const words = normalizeRaidSearchText(raidName).split(' ').filter(Boolean)
  const candidates = new Set<string>()

  for (let length = words.length; length >= 1; length -= 1) {
    for (let start = 0; start <= words.length - length; start += 1) {
      candidates.add(words.slice(start, start + length).join(' '))
    }
  }

  return candidates
}

function findRaidByCandidate(candidate: string, raidGroups: RaidGroup[]): RaidGroup | null {
  const expanded = RAID_ABBREVIATIONS[candidate]
  if (expanded) {
    const normalizedExpanded = normalizeRaidSearchText(expanded)
    const expandedMatches = raidGroups.filter(
      (g) => normalizeRaidSearchText(g.raidName).includes(normalizedExpanded),
    )
    if (expandedMatches.length === 1) return expandedMatches[0]
    if (expandedMatches.length > 1) {
      const exactExpandedMatch = expandedMatches.find(
        (g) => normalizeRaidSearchText(g.raidName) === normalizedExpanded,
      )
      if (exactExpandedMatch) return exactExpandedMatch
      return expandedMatches[0]
    }
  }

  const candidateWords = candidate.split(' ').filter(Boolean)
  if (candidateWords.length > 1 || candidate.length >= 5) {
    const matches = raidGroups.filter((g) => buildRaidNameCandidates(g.raidName).has(candidate))
    if (matches.length === 1) return matches[0]
  }

  return null
}

/**
 * Match a token (word or abbreviation) from a comment against the available
 * raid groups. Returns every distinct raid mentioned, so "fom and hunt"
 * resolves both raids instead of stopping at the first hit.
 */
export function matchTokenToRaids(
  token: string,
  raidGroups: RaidGroup[],
): RaidGroup[] {
  const normalized = normalizeRaidSearchText(token)
  if (!normalized) return []

  const words = normalized.split(' ')
  const matched: RaidGroup[] = []
  const seen = new Set<string>()
  const usedSpans: Array<{ start: number; end: number }> = []

  for (let length = words.length; length >= 1; length -= 1) {
    for (let start = 0; start <= words.length - length; start += 1) {
      const end = start + length - 1
      if (usedSpans.some((span) => start <= span.end && end >= span.start)) continue

      const candidate = words.slice(start, start + length).join(' ')
      const matchedRaid = findRaidByCandidate(candidate, raidGroups)
      if (!matchedRaid) continue

      usedSpans.push({ start, end })
      if (!seen.has(matchedRaid.questId)) {
        seen.add(matchedRaid.questId)
        matched.push(matchedRaid)
      }
    }
  }

  return matched
}

/**
 * Raid groups plus every raid known to the quest cache. Train matching must not
 * depend on which raids tracked characters happened to run this lockout.
 */
export function buildRaidTrainCatalog(
  raidGroups: RaidGroup[],
  questsById: Record<string, Quest>,
): RaidGroup[] {
  const catalog = [...raidGroups]
  const seen = new Set(raidGroups.map((g) => g.questId))
  for (const quest of Object.values(questsById)) {
    const questId = String(quest.id)
    if (quest.type !== 'Raid' || seen.has(questId)) continue
    seen.add(questId)
    catalog.push({ questId, raidName: quest.name, questLevel: quest.level, entries: [] })
  }
  return catalog
}

/**
 * Detect raid train from an LFM comment string.
 * Returns an array of unique matched RaidGroups.
 *
 * Heuristic: split comment by common delimiters (/, >, +, comma, arrow) and
 * try to match each segment. A "train" is 2+ distinct raids.
 */
export function detectRaidTrain(
  comment: string,
  raidGroups: RaidGroup[],
): RaidGroup[] {
  if (!comment) return []

  const segments = comment
    .split(/[/>,+→➜➤|]|->|=>/)
    .map((s) => s.trim())
    .filter(Boolean)

  const matched: RaidGroup[] = []
  const seen = new Set<string>()

  for (const segment of segments) {
    for (const raid of matchTokenToRaids(segment, raidGroups)) {
      if (seen.has(raid.questId)) continue
      seen.add(raid.questId)
      matched.push(raid)
    }
  }

  // Only consider it a train if 2+ distinct raids are found
  return matched.length >= 2 ? matched : []
}

export interface TrainCharacterAvailability {
  characterId: string
  characterName: string
  playerName: string
  totalLevel: number
  classes: CharacterClass[]
  isOnline: boolean
  locationId: string | null
  /** Per-raid availability: questId → available */
  perRaid: Record<string, boolean>
  /** True if available for every raid in the train */
  availableForAll: boolean
}

export interface TrainPlayerGroup {
  player: string
  characters: TrainCharacterAvailability[]
  /** True if at least one character can do the whole train */
  hasFullTrainChar: boolean
  /** True if any of the player's characters are online */
  isPlayerOnline: boolean
}

/**
 * Build the availability matrix for a set of raids.
 * Groups results by player, highlights characters that can do all raids.
 */
export function buildTrainAvailability(
  selectedRaids: RaidGroup[],
  now: Date,
): TrainPlayerGroup[] {
  if (!selectedRaids.length) return []

  // Collect all unique characters across all selected raids
  const charMap = new Map<string, {
    entry: RaidEntry
    perRaid: Record<string, boolean>
    isOnline: boolean
  }>()

  for (const raid of selectedRaids) {
    for (const entry of raid.entries) {
      let existing = charMap.get(entry.characterId)
      if (!existing) {
        existing = { entry, perRaid: {}, isOnline: entry.isOnline }
        charMap.set(entry.characterId, existing)
      }
      if (entry.isOnline) existing.isOnline = true
      existing.perRaid[raid.questId] = isEntryAvailable(entry, now)
    }
  }

  // A raid with no recorded entries (catalog-only) has no lockout to report, so
  // everyone counts as available, matching isEntryAvailable(null) === true.
  for (const raid of selectedRaids) {
    if (raid.entries.length) continue
    for (const { perRaid } of charMap.values()) perRaid[raid.questId] = true
  }

  // Build character availability objects
  const characters: TrainCharacterAvailability[] = Array.from(charMap.values()).map(({ entry, perRaid, isOnline }) => ({
    characterId: entry.characterId,
    characterName: entry.characterName,
    playerName: entry.playerName,
    totalLevel: entry.totalLevel,
    classes: entry.classes,
    isOnline,
    locationId: entry.locationId,
    perRaid,
    availableForAll: selectedRaids.every((r) => perRaid[r.questId] === true),
  }))

  // Group by player
  const playerMap = new Map<string, TrainCharacterAvailability[]>()
  for (const c of characters) {
    const arr = playerMap.get(c.playerName) ?? []
    arr.push(c)
    playerMap.set(c.playerName, arr)
  }

  const groups: TrainPlayerGroup[] = Array.from(playerMap.entries()).map(
    ([player, chars]) => {
      // Sort: available-for-all first, then by level desc
      const sorted = chars.slice().sort((a, b) => {
        if (a.availableForAll !== b.availableForAll) return a.availableForAll ? -1 : 1
        return b.totalLevel - a.totalLevel
      })
      return {
        player,
        characters: sorted,
        hasFullTrainChar: sorted.some((c) => c.availableForAll),
        isPlayerOnline: sorted.some((c) => c.isOnline),
      }
    },
  )

  // Sort: online players first, then players with full-train chars, then alphabetical
  groups.sort((a, b) => {
    if (a.isPlayerOnline !== b.isPlayerOnline) return a.isPlayerOnline ? -1 : 1
    if (a.hasFullTrainChar !== b.hasFullTrainChar) return a.hasFullTrainChar ? -1 : 1
    if (a.player === 'Unknown' && b.player !== 'Unknown') return 1
    if (b.player === 'Unknown' && a.player !== 'Unknown') return -1
    return a.player.localeCompare(b.player)
  })

  return groups
}
