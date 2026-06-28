import { getCharacterDisplayName, Quest, ServerCharacter } from '@/api/ddoAudit'

export type PlayerSortKey = 'name' | 'guild' | 'level' | 'party'
export type SortDirection = 'asc' | 'desc'

function getSortableGuildName(character: ServerCharacter): string {
  const guildName = String(character.guild_name ?? '').trim()
  return guildName || '~'
}

export function getDefaultSortDirection(key: PlayerSortKey): SortDirection {
  return key === 'level' || key === 'party' ? 'desc' : 'asc'
}

function applySortDirection(value: number, direction: SortDirection): number {
  return direction === 'asc' ? value : -value
}

export function compareQuestLocationPlayers(
  a: ServerCharacter,
  b: ServerCharacter,
  sortKey: PlayerSortKey,
  direction: SortDirection,
): number {
  const compareByName =
    getCharacterDisplayName(a.name, { isAnonymous: a.is_anonymous }).localeCompare(
      getCharacterDisplayName(b.name, { isAnonymous: b.is_anonymous }),
    )
  const compareByGuild = getSortableGuildName(a).localeCompare(getSortableGuildName(b))
  const compareByLevel = a.total_level - b.total_level
  const compareByParty = Number(a.is_in_party) - Number(b.is_in_party)

  const primary =
    sortKey === 'name'
      ? compareByName
      : sortKey === 'guild'
        ? compareByGuild
        : sortKey === 'level'
          ? compareByLevel
          : compareByParty

  if (primary !== 0) return applySortDirection(primary, direction)

  const tieBreakers: Array<{ key: PlayerSortKey; value: number; direction: SortDirection }> = [
    { key: 'party', value: compareByParty, direction: 'desc' },
    { key: 'level', value: compareByLevel, direction: 'desc' },
    { key: 'guild', value: compareByGuild, direction: 'asc' },
    { key: 'name', value: compareByName, direction: 'asc' },
  ]

  for (const tieBreaker of tieBreakers) {
    if (tieBreaker.key === sortKey || tieBreaker.value === 0) continue
    return applySortDirection(tieBreaker.value, tieBreaker.direction)
  }

  return 0
}

export function buildQuestLocationIds(questInfo: Quest | null): Set<string> {
  const ids = new Set<string>()
  if (questInfo?.id) ids.add(String(questInfo.id))
  if (questInfo?.areaId) ids.add(String(questInfo.areaId))
  return ids
}

export function filterPlayersInQuestLocation(characters: ServerCharacter[], locationIds: Set<string>): ServerCharacter[] {
  if (locationIds.size === 0) return []
  return characters.filter((character) => locationIds.has(String(character.location_id)))
}
