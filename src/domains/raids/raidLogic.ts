import { addMs, Quest, RAID_LOCKOUT_MS, isTimerIgnored } from '../../api/ddoAudit'
import { CHARACTERS, PLAYER_DISPLAY_NAMES } from '../../config/characters'

export function getPlayerDisplayName(playerName: string): string {
  return PLAYER_DISPLAY_NAMES[playerName] ?? playerName
}

// Lookup player by character name using CHARACTERS mapping
export function getPlayerName(characterName: string | null | undefined): string {
  const name = String(characterName ?? '').trim()
  if (!name) return 'Unknown'
  // Find the character in CHARACTERS by name (case-insensitive)
  const found = Object.values(CHARACTERS).find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  return found?.player ?? 'Unknown'
}

export interface CharacterClass {
  name: string
  level: number
}

export interface RaidEntry {
  characterId: string
  characterName: string
  playerName: string
  totalLevel: number | null
  classes: CharacterClass[]
  race: string
  lastTimestamp: string | null
  isOnline: boolean
  isInRaid: boolean
}

export interface PlayerGroup {
  player: string
  entries: RaidEntry[]
}

export function groupEntriesByPlayer(entries: RaidEntry[], now: Date): PlayerGroup[] {
  const map = new Map<string, RaidEntry[]>()
  const nowTime = now.getTime()
  for (const e of entries ?? []) {
    const player = e?.playerName ?? 'Unknown'
    const arr = map.get(player) ?? []
    arr.push(e)
    map.set(player, arr)
  }

  const groups = Array.from(map.entries()).map(([player, list]) => {
    const sorted = list.slice().sort((a, b) => {
      const aHasTimer = Boolean(a?.lastTimestamp)
      const bHasTimer = Boolean(b?.lastTimestamp)
      if (aHasTimer !== bHasTimer) return aHasTimer ? 1 : -1

      const aReadyAt = addMs(a.lastTimestamp, RAID_LOCKOUT_MS)
      const bReadyAt = addMs(b.lastTimestamp, RAID_LOCKOUT_MS)
      const aRemaining = aReadyAt ? aReadyAt.getTime() - nowTime : Number.POSITIVE_INFINITY
      const bRemaining = bReadyAt ? bReadyAt.getTime() - nowTime : Number.POSITIVE_INFINITY

      // Asc: less time remaining first.
      const byRemaining = aRemaining - bRemaining
      if (byRemaining !== 0) return byRemaining

      return String(a.characterName).localeCompare(String(b.characterName))
    })
    return { player, entries: sorted }
  })

  groups.sort((a, b) => {
    if (a.player === 'Unknown' && b.player !== 'Unknown') return 1
    if (b.player === 'Unknown' && a.player !== 'Unknown') return -1
    return a.player.localeCompare(b.player)
  })

  return groups
}

export function formatClasses(classes: any[]): string {
  const list = Array.isArray(classes) ? classes : []
  const filtered = list.filter((c) => c?.name && c?.name !== 'Epic' && c?.name !== 'Legendary')
  if (!filtered.length) return '—'
  return filtered.map((c) => `${c.name} ${c.level}`).join(', ')
}

export function isLevelInTier(lvl: number | null, tierFilter: string | null | undefined): boolean {
  if (!tierFilter || tierFilter === 'all') return true
  if (lvl === null) return false
  if (tierFilter === 'heroic') return lvl < 20
  if (tierFilter === 'epic') return lvl >= 20 && lvl <= 29
  if (tierFilter === 'legendary') return lvl >= 30
  return true
}

export function isEntryAvailable(entry: RaidEntry | null | undefined, now: Date): boolean {
  if (!entry) return true
  // If the exact characterId + lastTimestamp pair is ignored by the client, treat as available.
  try {
    if (isTimerIgnored(entry.characterId, entry.lastTimestamp)) return true
  } catch (err) {
    // ignore errors and fall back to default logic
  }

  const readyAt = addMs(entry.lastTimestamp, RAID_LOCKOUT_MS)
  if (!readyAt) return true
  return readyAt.getTime() - now.getTime() <= 0
}

export interface RaidGroup {
  questId: string
  raidName: string
  adventurePack?: string | null
  questLevel: number | null
  entries: RaidEntry[]
}

export function buildRaidGroups({ raidActivity, questsById, charactersById }: { raidActivity: any[], questsById: Record<string, Quest>, charactersById: Record<string, any> }): RaidGroup[] {
  /**
   * groupKey: normalized raid name
   * value: { questId, raidName, questLevel, entries: Array<{ characterId, characterName, playerName, lastTimestamp }> }
   */
  const groups = new Map<string, any>()

  function normalizeRaidKey(name: string) {
    return String(name ?? '').trim().toLowerCase()
  }

  function isBetterQuestLevel(nextLevel: number | null, currentLevel: number | null) {
    const a = typeof nextLevel === 'number' ? nextLevel : -1
    const b = typeof currentLevel === 'number' ? currentLevel : -1
    return a > b
  }

  for (const item of raidActivity ?? []) {
    const characterId = String(item?.character_id ?? '')
    const ts = item?.timestamp
    const questIds = item?.data?.quest_ids ?? []

    if (!characterId || !ts || !Array.isArray(questIds)) continue

    const character = charactersById?.[characterId]
    const totalLevel = character?.total_level ?? null
    const race = character?.race ?? 'Unknown'

    const characterName = character?.name ?? characterId
    const playerName = getPlayerName(characterName)
    const classes = character?.classes ?? []

    for (const questIdRaw of questIds) {
      const questId = String(questIdRaw)
      if (!questId) continue

      const raidName = questsById?.[questId]?.name ?? `Unknown quest (${questId})`
      const questLevel = questsById?.[questId]?.level ?? null
      const adventurePack = questsById?.[questId]?.required_adventure_pack ?? null
      if (typeof questLevel === 'number' && questLevel < 20) continue

      // Some raids exist as multiple quest_ids (e.g., different level versions).
      // Collapse those duplicates by raid name and keep the highest-level representative.
      const groupKey = normalizeRaidKey(raidName)

      const existing = groups.get(groupKey) ?? {
        questId,
        raidName,
        adventurePack,
        questLevel,
        entriesByCharacterId: new Map<string, RaidEntry>(),
      }

      if (isBetterQuestLevel(questLevel, existing.questLevel)) {
        existing.questId = questId
        existing.questLevel = questLevel
        existing.raidName = raidName
        existing.adventurePack = adventurePack
      }

      const prev = existing.entriesByCharacterId.get(characterId)
      if (!prev || new Date(ts).getTime() > new Date(prev.lastTimestamp).getTime()) {
        const quest = questsById?.[questId]
        const questAreaId = quest?.areaId
        const isOnline = !!character?.is_online
        const locationId = character?.location_id ? String(character.location_id) : null
        const isInRaid = !!(locationId && (locationId === questId || (questAreaId && locationId === questAreaId)))

        existing.entriesByCharacterId.set(characterId, {
          characterId,
          characterName,
          playerName,
          totalLevel,
          classes,
          race,
          lastTimestamp: ts,
          isOnline,
          isInRaid,
        })
      }

      groups.set(groupKey, existing)
    }
  }

  // Add placeholder entries for characters with no timer for this raid.
  const allCharacterIds = Object.keys(charactersById ?? {})
    .map(String)
  for (const g of groups.values()) {
    const quest = questsById?.[g.questId]
    const questAreaId = quest?.areaId

    for (const characterId of allCharacterIds) {
      if (g.entriesByCharacterId.has(characterId)) continue
      const character = charactersById?.[characterId]
      const characterName = character?.name ?? characterId
      const playerName = getPlayerName(characterName)
      const totalLevel = character?.total_level ?? null
      const classes = character?.classes ?? []
      const race = character?.race ?? 'Unknown'

      const isOnline = !!character?.is_online
      const locationId = character?.location_id ? String(character.location_id) : null
      const isInRaid = !!(locationId && (locationId === g.questId || (questAreaId && locationId === questAreaId)))

      g.entriesByCharacterId.set(characterId, {
        characterId,
        characterName,
        playerName,
        totalLevel,
        classes,
        race,
        lastTimestamp: null,
        isOnline,
        isInRaid,
      })
    }
  }

  const normalized = Array.from(groups.values()).map((g) => {
    const entries = Array.from(g.entriesByCharacterId.values() as Iterable<RaidEntry>).sort((a, b) => {
      const byPlayer = String(a.playerName).localeCompare(String(b.playerName))
      if (byPlayer !== 0) return byPlayer
      const byName = String(a.characterName).localeCompare(String(b.characterName))
      if (byName !== 0) return byName
      if (!a.lastTimestamp && b.lastTimestamp) return -1
      if (!b.lastTimestamp && a.lastTimestamp) return 1
      if (!a.lastTimestamp && !b.lastTimestamp) return 0
      return new Date(a.lastTimestamp!).getTime() - new Date(b.lastTimestamp!).getTime()
    })
    return {
      questId: g.questId,
      raidName: g.raidName,
      adventurePack: g.adventurePack ?? null,
      questLevel: g.questLevel ?? null,
      entries,
    }
  })

  normalized.sort((a, b) => {
    const aLevel = typeof a.questLevel === 'number' ? a.questLevel : -1
    const bLevel = typeof b.questLevel === 'number' ? b.questLevel : -1
    if (aLevel !== bLevel) return bLevel - aLevel
    return a.raidName.localeCompare(b.raidName)
  })

  return normalized
}
