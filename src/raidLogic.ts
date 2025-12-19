import { addMs, RAID_LOCKOUT_MS, Quest } from './ddoAuditApi'

export const EXPECTED_PLAYERS = ['Johnson', 'Jonah', 'Michael', 'Ken', 'Renz', 'OldMic']

const PLAYER_DISPLAY_NAMES: Record<string, string> = {
  OldMic: '老mic',
}

export function getPlayerDisplayName(playerName: string): string {
  return PLAYER_DISPLAY_NAMES[playerName] ?? playerName
}

export const CHARACTERS_BY_PLAYER: Record<string, string[]> = {
  Johnson: ['nonjosh', 'nonjoshii', 'nonjoshiv', 'mvppiker'],
  Jonah: ['zenser', 'zenrar', 'zertiar', 'zevkar', 'magiz'],
  Michael: ['garei', 'tareos', 'karc', 'warkon', 'kayos'],
  Ken: ['kenami', 'nekamisama', 'nekami', 'amiken', 'feldspars', 'waven', 'fatslayer', 'fateslayer', 'temor', 'nameisfree'],
  Renz: ['hako', 'renz', 'okah', 'zner', 'zneri', 'znerii', 'zneriii', 'zneriv', 'znery'],
  OldMic: ['ctenmiir', 'keviamin', 'graceella', 'castra'],
}

function buildPlayerByCharacterName(charactersByPlayer: Record<string, string[]>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [player, names] of Object.entries(charactersByPlayer ?? {})) {
    for (const rawName of names ?? []) {
      const key = String(rawName ?? '').trim().toLowerCase()
      if (!key) continue
      map[key] = player
    }
  }
  return map
}

// Back-compat export: existing code expects character -> player.
export const PLAYER_BY_CHARACTER_NAME = buildPlayerByCharacterName(CHARACTERS_BY_PLAYER)

export function getPlayerName(characterName: string | null | undefined): string {
  const key = String(characterName ?? '').trim().toLowerCase()
  if (!key) return 'Unknown'
  return PLAYER_BY_CHARACTER_NAME[key] ?? 'Unknown'
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

export function isEntryAvailable(entry: RaidEntry | null | undefined, now: Date): boolean {
  const readyAt = addMs(entry?.lastTimestamp, RAID_LOCKOUT_MS)
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
        existing.entriesByCharacterId.set(characterId, {
          characterId,
          characterName,
          playerName,
          totalLevel,
          classes,
          race,
          lastTimestamp: ts,
        })
      }

      groups.set(groupKey, existing)
    }
  }

  // Add placeholder entries for characters with no timer for this raid.
  const allCharacterIds = Object.keys(charactersById ?? {})
    .map(String)
  for (const g of groups.values()) {
    for (const characterId of allCharacterIds) {
      if (g.entriesByCharacterId.has(characterId)) continue
      const character = charactersById?.[characterId]
      const characterName = character?.name ?? characterId
      const playerName = getPlayerName(characterName)
      const totalLevel = character?.total_level ?? null
      const classes = character?.classes ?? []
      const race = character?.race ?? 'Unknown'
      g.entriesByCharacterId.set(characterId, {
        characterId,
        characterName,
        playerName,
        totalLevel,
        classes,
        race,
        lastTimestamp: null,
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
