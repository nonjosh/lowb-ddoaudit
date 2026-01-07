import { Quest } from '@/api/ddoAudit'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { getEffectiveLevel, isRaidQuest, parseReaperSkulls } from '@/domains/quests/questHelpers'
import { CharacterClass, formatClasses, getPlayerDisplayName, getPlayerName, isLevelInTier } from '@/domains/raids/raidLogic'

interface LfmCharacter {
  id: string | number
  name: string
  race: string
  total_level: number
  classes: CharacterClass[]
  location_id: number
  guild_name?: string
}

interface LfmActivity {
  timestamp: string
  events?: Array<{ tag: string;[key: string]: unknown }>
}

export interface LfmData {
  id: string | number
  quest_id: string | number
  difficulty?: string
  comment?: string
  adventure_active_time?: string | number
  minimum_level: number
  maximum_level: number
  leader: LfmCharacter
  members?: LfmCharacter[]
  activity: LfmActivity[]
}

export interface LfmParticipant {
  characterName: string
  playerName: string
  playerDisplayName: string
  guildName: string
  totalLevel: number | null
  classesDisplay: string
  classes: CharacterClass[]
  isLeader: boolean
  race: string
  location_id: number
}

export interface NormalizedLfm {
  id: string
  questId: string
  questName: string
  adventurePack: string | null
  areaId: string
  questLevel: number | null
  isRaid: boolean
  difficulty: string
  difficultyDisplay: string
  difficultyColor: string
  adventureActiveMinutes: number | null
  reaperSkulls: number | null
  leaderName: string
  leaderGuildName: string
  minLevel: number | null
  maxLevel: number | null
  comment: string
  participants: LfmParticipant[]
  memberCount: number
  maxPlayers: number
  openSlots: number
  majorityGuildName: string
  majorityGuildCount: number
  hasMajorityGuild: boolean
  leaderGuildIsMajority: boolean
  postedAt: string | null
  hasFriendInside: boolean
  friendPlayersInside: string[]
}

export interface PreparedLfmData {
  questName: string
  adventurePack: string | null
  areaId: string
  questLevel: number | null
  adventureActiveMinutes: number | null
  difficultyDisplay: string
  difficultyColor: string
  participants: LfmParticipant[]
  maxPlayers: number
  isRaid: boolean
  questId: string
  postedAt: string | null
}

/**
 * Prepares LFM data for display in the participants dialog.
 * Extracts and formats all participant information including classes, levels, guilds, etc.
 */
export function prepareLfmParticipants(lfm: LfmData, quest: Quest | null): PreparedLfmData {
  const isRaid = isRaidQuest(quest)
  const maxPlayers = isRaid ? 12 : 6

  const participants: LfmParticipant[] = [lfm.leader, ...(lfm?.members ?? [])]
    .filter(Boolean)
    .map((p) => {
      const characterName = String(p.name).trim() || '—'
      const playerName = getPlayerName(characterName)
      const classesDisplay = formatClasses(p.classes)
      return {
        characterName,
        playerName,
        playerDisplayName: getPlayerDisplayName(playerName),
        guildName: String(p?.guild_name ?? '').trim() || '',
        totalLevel: p.total_level,
        classesDisplay,
        classes: p.classes,
        isLeader: Boolean(lfm.leader.id && p.id && p.id === lfm.leader.id),
        race: p.race,
        location_id: p.location_id,
      }
    })

  const difficulty = String(lfm?.difficulty ?? '').trim() || '—'
  const comment = String(lfm?.comment ?? '').trim() || ''
  const reaperSkulls = difficulty.toLowerCase() === 'reaper' ? parseReaperSkulls(comment) : null
  const difficultyDisplay =
    difficulty.toLowerCase() === 'reaper' && typeof reaperSkulls === 'number'
      ? `Reaper ${reaperSkulls}`
      : difficulty

  const difficultyColor = getDifficultyColor(difficulty)
  const adventureActiveRaw = lfm?.adventure_active_time
  const adventureActiveSeconds = typeof adventureActiveRaw === 'string' ? Number(adventureActiveRaw) : adventureActiveRaw
  let adventureActiveMinutes: number | null = null
  if (typeof adventureActiveSeconds === 'number' && !Number.isNaN(adventureActiveSeconds)) {
    const minutes = Math.max(0, Math.round(adventureActiveSeconds / 60))
    adventureActiveMinutes = minutes > 0 ? minutes : null
  }

  return {
    questName: quest?.name || 'Unknown Quest',
    adventurePack: quest?.required_adventure_pack ?? null,
    areaId: quest?.areaId || '',
    questLevel: getEffectiveLevel(lfm, quest),
    adventureActiveMinutes,
    difficultyDisplay,
    difficultyColor,
    participants,
    maxPlayers,
    isRaid,
    questId: quest?.id || '',
    postedAt: null,
  }
}

/**
 * Gets the color for displaying difficulty level.
 */
export function getDifficultyColor(difficulty: string): string {
  const d = difficulty.toLowerCase()
  if (d === 'reaper') return 'error.main'
  if (d === 'elite') return 'warning.main'
  if (d === 'hard') return 'info.main'
  return 'text.primary'
}

function getGroupNames(lfm: LfmData): string[] {
  const names = []
  const leaderName = lfm.leader.name
  if (leaderName) names.push(leaderName)

  for (const m of lfm?.members ?? []) {
    if (m.name) names.push(m.name)
  }

  return names
}

/**
 * Normalizes a single LFM object for display in the list.
 */
export function normalizeLfm(lfm: LfmData, quest: Quest | null): NormalizedLfm | null {
  const questId = String(lfm?.quest_id ?? '')
  if (!questId) return null

  const isRaid = isRaidQuest(quest)
  const questName = String(quest?.name ?? '').trim() || ''
  const maxPlayers = isRaid ? 12 : 6
  const level = getEffectiveLevel(lfm, quest)

  const leaderName = String(lfm.leader.name ?? '').trim() || '—'
  const leaderGuildName = String(lfm.leader.guild_name ?? '').trim() || ''
  const minLevel = lfm.minimum_level
  const maxLevel = lfm.maximum_level
  const comment = String(lfm?.comment ?? '').trim() || ''

  const difficulty = String(lfm?.difficulty ?? '').trim() || '—'
  const reaperSkulls = difficulty.toLowerCase() === 'reaper' ? parseReaperSkulls(comment) : null
  const difficultyDisplay =
    difficulty.toLowerCase() === 'reaper' && typeof reaperSkulls === 'number'
      ? `Reaper ${reaperSkulls}`
      : difficulty

  const difficultyColor = getDifficultyColor(difficulty)
  const adventureActiveRaw = lfm?.adventure_active_time
  const adventureActiveSeconds = typeof adventureActiveRaw === 'string' ? Number(adventureActiveRaw) : adventureActiveRaw
  let adventureActiveMinutes: number | null = null
  if (typeof adventureActiveSeconds === 'number' && !Number.isNaN(adventureActiveSeconds)) {
    const minutes = Math.max(0, Math.round(adventureActiveSeconds / 60))
    adventureActiveMinutes = minutes > 0 ? minutes : null
  }

  const memberCount = 1 + (lfm?.members?.length ?? 0)

  const participants: LfmParticipant[] = [lfm.leader, ...(lfm?.members ?? [])]
    .filter(Boolean)
    .map((p) => {
      const characterName = String(p.name).trim() || '—'
      const playerName = getPlayerName(characterName)
      const classesDisplay = formatClasses(p.classes)
      return {
        characterName,
        playerName,
        playerDisplayName: getPlayerDisplayName(playerName),
        guildName: String(p?.guild_name ?? '').trim() || '',
        totalLevel: p.total_level,
        classesDisplay,
        classes: p.classes,
        isLeader: Boolean(lfm.leader.id && p.id && p.id === lfm.leader.id),
        race: p.race,
        location_id: p.location_id,
      }
    })

  /** @type {Map<string, number>} */
  const guildCounts = new Map()
  const leaderGuild = String(lfm.leader.guild_name ?? '').trim()
  if (leaderGuild) guildCounts.set(leaderGuild, (guildCounts.get(leaderGuild) ?? 0) + 1)
  for (const m of lfm?.members ?? []) {
    const g = String(m.guild_name ?? '').trim()
    if (!g) continue
    guildCounts.set(g, (guildCounts.get(g) ?? 0) + 1)
  }

  let majorityGuildName = ''
  let majorityGuildCount = 0
  for (const [g, c] of guildCounts.entries()) {
    if (c > majorityGuildCount) {
      majorityGuildName = g
      majorityGuildCount = c
    }
  }

  // Don't highlight guild "majority" when the leader is alone.
  const hasMajorityGuild = memberCount > 1 && majorityGuildCount >= 3
  const leaderGuildIsMajority = Boolean(
    hasMajorityGuild && leaderGuildName && majorityGuildName && leaderGuildName === majorityGuildName
  )

  const groupNames = getGroupNames(lfm)
  const playersInGroup = new Set(groupNames.map(getPlayerName))
  const hasFriendInside = EXPECTED_PLAYERS.some((p) => playersInGroup.has(p))

  const friendPlayersInside = Array.from(
    new Set(groupNames.map(getPlayerName).filter((p) => EXPECTED_PLAYERS.includes(p))),
  ).sort((a, b) => a.localeCompare(b))

  let postedTimestamp: string | null = null
  if (Array.isArray(lfm.activity)) {
    for (const act of lfm.activity) {
      if (act.events && Array.isArray(act.events)) {
        for (const event of act.events) {
          if (event.tag === 'posted') {
            postedTimestamp = act.timestamp
            break
          }
        }
        if (postedTimestamp) break
      }
    }
  }

  return {
    id: String(lfm.id),
    questId,
    questName,
    adventurePack: quest?.required_adventure_pack ?? null,
    areaId: quest?.areaId ?? '',
    questLevel: level,
    isRaid,
    difficulty,
    difficultyDisplay,
    difficultyColor,
    adventureActiveMinutes,
    reaperSkulls,
    leaderName,
    leaderGuildName,
    minLevel,
    maxLevel,
    comment,
    participants,
    memberCount,
    maxPlayers,
    openSlots: Math.max(0, maxPlayers - memberCount),
    majorityGuildName,
    majorityGuildCount,
    hasMajorityGuild,
    leaderGuildIsMajority,
    postedAt: postedTimestamp,
    hasFriendInside,
    friendPlayersInside,
  }
}

/**
 * Filters and sorts normalized LFMs based on quest and tier filters.
 */
export function filterAndSortLfms(normalized: NormalizedLfm[], questFilter: string, tierFilter: string): NormalizedLfm[] {
  // Hide full groups.
  let filtered = normalized.filter((x) => (x?.openSlots ?? 0) > 0)

  // Toggle between raid-only and all quests.
  if (questFilter === 'raid') {
    filtered = filtered.filter((x) => x.isRaid)
  }

  // Filter by tier based on quest level.
  // heroic: <20, epic: 20-29, legendary: >30
  if (typeof tierFilter === 'string' && tierFilter !== 'all') {
    filtered = filtered.filter((x) => isLevelInTier(typeof x.questLevel === 'number' ? x.questLevel : null, tierFilter))
  }

  // Sort by quest level desc (then most recently updated, then name).
  filtered.sort((a, b) => {
    const aHasName = Boolean(String(a.questName ?? '').trim())
    const bHasName = Boolean(String(b.questName ?? '').trim())
    if (aHasName !== bHasName) return aHasName ? -1 : 1

    const aLevel = typeof a.questLevel === 'number' ? a.questLevel : -1
    const bLevel = typeof b.questLevel === 'number' ? b.questLevel : -1
    if (aLevel !== bLevel) return bLevel - aLevel

    const aTs = a.postedAt ? new Date(a.postedAt).getTime() : 0
    const bTs = b.postedAt ? new Date(b.postedAt).getTime() : 0
    if (aTs !== bTs) return bTs - aTs

    return a.questName.localeCompare(b.questName)
  })

  return filtered
}

/**
 * Creates a map of character names to their associated LFMs.
 */
export function createLfmByCharacterNameMap(lfms: Record<string, PreparedLfmData>): Map<string, PreparedLfmData> {
  const map = new Map<string, PreparedLfmData>()
  Object.values(lfms || {}).forEach((lfm) => {
    if (lfm.participants) {
      lfm.participants.forEach((p) => {
        if (p.characterName) map.set(p.characterName, lfm)
      })
    }
  })
  return map
}
