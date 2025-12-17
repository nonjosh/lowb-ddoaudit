import { addMs, RAID_LOCKOUT_MS } from './ddoAuditApi'

export const EXPECTED_PLAYERS = ['Johnson', 'Jonah', 'Michael', 'Ken', 'Renz', 'old mic']

export const PLAYER_BY_CHARACTER_NAME = {
  // Johnson
  nonjosh: 'Johnson',
  nonjoshii: 'Johnson',
  nonjoshiv: 'Johnson',
  mvppiker: 'Johnson',

  // Jonah
  zenser: 'Jonah',
  zenrar: 'Jonah',
  zertiar: 'Jonah',
  zevkar: 'Jonah',
  magiz: 'Jonah',

  // Michael
  garei: 'Michael',
  tareos: 'Michael',
  karc: 'Michael',
  warkon: 'Michael',
  kayos: 'Michael',

  // Ken
  kenami: 'Ken',
  nekamisama: 'Ken',
  nekami: 'Ken',
  amiken: 'Ken',
  feldspars: 'Ken',
  waven: 'Ken',
  fatslayer: 'Ken',
  fateslayer: 'Ken',
  temor: 'Ken',
  nameisfree: 'Ken',

  // Renz
  hako: 'Renz',
  renz: 'Renz',
  okah: 'Renz',
  zner: 'Renz',
  zneri: 'Renz',
  znerii: 'Renz',
  zneriii: 'Renz',
  zneriv: 'Renz',
  znery: 'Renz',

  // old mic
  ctenmiir: 'old mic',
  keviamin: 'old mic',
  graceella: 'old mic',
  castra: 'old mic',
}

export function getPlayerName(characterName) {
  const key = String(characterName ?? '').trim().toLowerCase()
  if (!key) return 'Unknown'
  return PLAYER_BY_CHARACTER_NAME[key] ?? 'Unknown'
}

export function groupEntriesByPlayer(entries, now) {
  /** @type {Map<string, any[]>} */
  const map = new Map()
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
      const aRemaining = aReadyAt ? aReadyAt.getTime() - now : Number.POSITIVE_INFINITY
      const bRemaining = bReadyAt ? bReadyAt.getTime() - now : Number.POSITIVE_INFINITY

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

export function formatClasses(classes) {
  const list = Array.isArray(classes) ? classes : []
  const filtered = list.filter((c) => c?.name && c?.name !== 'Epic' && c?.name !== 'Legendary')
  if (!filtered.length) return '—'
  return filtered.map((c) => `${c.name} ${c.level}`).join(', ')
}

export function isEntryAvailable(entry, now) {
  const readyAt = addMs(entry?.lastTimestamp, RAID_LOCKOUT_MS)
  if (!readyAt) return true
  return readyAt.getTime() - now <= 0
}

export function buildRaidGroups({ raidActivity, questsById, charactersById }) {
  /**
   * groupKey: normalized raid name
   * value: { questId, raidName, questLevel, entries: Array<{ characterId, characterName, playerName, lastTimestamp }> }
   */
  const groups = new Map()

  function normalizeRaidKey(name) {
    return String(name ?? '').trim().toLowerCase()
  }

  function isBetterQuestLevel(nextLevel, currentLevel) {
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

    const characterName = character?.name ?? characterId
    const playerName = getPlayerName(characterName)
    const classes = character?.classes ?? []

    for (const questIdRaw of questIds) {
      const questId = String(questIdRaw)
      if (!questId) continue

      const raidName = questsById?.[questId]?.name ?? `Unknown quest (${questId})`
      const questLevel = questsById?.[questId]?.level ?? null
      if (typeof questLevel === 'number' && questLevel < 20) continue

      // Some raids exist as multiple quest_ids (e.g., different level versions).
      // Collapse those duplicates by raid name and keep the highest-level representative.
      const groupKey = normalizeRaidKey(raidName)

      const existing = groups.get(groupKey) ?? {
        questId,
        raidName,
        questLevel,
        entriesByCharacterId: new Map(),
      }

      if (isBetterQuestLevel(questLevel, existing.questLevel)) {
        existing.questId = questId
        existing.questLevel = questLevel
        existing.raidName = raidName
      }

      const prev = existing.entriesByCharacterId.get(characterId)
      if (!prev || new Date(ts).getTime() > new Date(prev.lastTimestamp).getTime()) {
        existing.entriesByCharacterId.set(characterId, {
          characterId,
          characterName,
          playerName,
          totalLevel,
          classes,
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
      g.entriesByCharacterId.set(characterId, {
        characterId,
        characterName,
        playerName,
        totalLevel,
        classes,
        lastTimestamp: null,
      })
    }
  }

  const normalized = Array.from(groups.values()).map((g) => {
    const entries = Array.from(g.entriesByCharacterId.values()).sort((a, b) => {
      const byPlayer = String(a.playerName).localeCompare(String(b.playerName))
      if (byPlayer !== 0) return byPlayer
      const byName = String(a.characterName).localeCompare(String(b.characterName))
      if (byName !== 0) return byName
      if (!a.lastTimestamp && b.lastTimestamp) return -1
      if (!b.lastTimestamp && a.lastTimestamp) return 1
      if (!a.lastTimestamp && !b.lastTimestamp) return 0
      return new Date(a.lastTimestamp).getTime() - new Date(b.lastTimestamp).getTime()
    })
    return { questId: g.questId, raidName: g.raidName, questLevel: g.questLevel ?? null, entries }
  })

  normalized.sort((a, b) => {
    const aLevel = typeof a.questLevel === 'number' ? a.questLevel : -1
    const bLevel = typeof b.questLevel === 'number' ? b.questLevel : -1
    if (aLevel !== bLevel) return bLevel - aLevel
    return a.raidName.localeCompare(b.raidName)
  })

  return normalized
}
