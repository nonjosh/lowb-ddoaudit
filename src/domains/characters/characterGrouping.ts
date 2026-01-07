import { Quest } from '@/api/ddoAudit'
import { PlayerGroup } from '@/contexts/CharacterContext'
import { getPlayerDisplayName } from '@/domains/raids/raidLogic'

export interface GroupedCharacters {
  publicAreaGroups: Record<string, PlayerGroup[]>
  wildernessAreaGroups: Record<string, PlayerGroup[]>
  notInQuestGroups: PlayerGroup[]
  questGroups: Record<string, PlayerGroup[]>
  questNameToPack: Record<string, string | null>
  questLevels: Record<string, string | null>
  wildernessAreaPacks: Record<string, string | null>
  offlineGroups: PlayerGroup[]
}

interface GroupCharactersParams {
  charactersByPlayer: PlayerGroup[]
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
}

/**
 * Groups player characters by their location type (public areas, wilderness, quests, offline, etc.)
 * This is the main grouping logic extracted from CharactersSection.
 */
export function groupCharactersByLocation({
  charactersByPlayer,
  quests,
  areas,
}: GroupCharactersParams): GroupedCharacters {
  const publicAreas: Record<string, PlayerGroup[]> = {}
  const wildernessAreas: Record<string, PlayerGroup[]> = {}
  const wildernessPacks: Record<string, string | null> = {}
  const notInQuest: PlayerGroup[] = []
  const questsMap: Record<string, PlayerGroup[]> = {}
  const questMeta: Record<string, string | null> = {}
  const levels: Record<string, string | null> = {}
  const offline: PlayerGroup[] = []

  // Sort by player name first to ensure consistent order
  const sortedGroups = [...charactersByPlayer].sort((a, b) =>
    getPlayerDisplayName(a.player).localeCompare(getPlayerDisplayName(b.player))
  )

  sortedGroups.forEach((group) => {
    const onlineChar = (group.chars ?? []).find((c) => c?.is_online)
    if (onlineChar) {
      const area = areas[onlineChar.location_id]
      const quest = quests[onlineChar.location_id]

      // Public areas first
      if (area && area.is_public) {
        const name = area.name || 'Unknown Area'
        if (!publicAreas[name]) publicAreas[name] = []
        publicAreas[name].push(group)
        return
      }

      // Wilderness areas next
      if (area && area.is_wilderness) {
        const name = area.name || 'Unknown Area'
        if (!wildernessAreas[name]) wildernessAreas[name] = []
        wildernessAreas[name].push(group)
        // try to capture an adventure pack for this wilderness (if available via quest mapping)
        const pack = quest?.required_adventure_pack
        if (wildernessPacks[name] == null) {
          wildernessPacks[name] = typeof pack === 'string' && pack.trim() ? pack.trim() : null
        }
        return
      }

      // Quests (one group per quest)
      if (quest?.name) {
        let groupKey = quest.name
        let isHeroic = false
        let isEpic = false

        if (quest.heroicLevel && quest.epicLevel) {
          const charLevel = (onlineChar.classes || []).reduce((sum: number, cls) => sum + (cls.level || 0), 0)
          const distHeroic = Math.abs(charLevel - quest.heroicLevel)
          const distEpic = Math.abs(charLevel - quest.epicLevel)
          if (distHeroic <= distEpic) {
            groupKey = `${quest.name} (Heroic)`
            isHeroic = true
          } else {
            groupKey = `${quest.name} (Epic)`
            isEpic = true
          }
        }

        if (!questsMap[groupKey]) questsMap[groupKey] = []
        questsMap[groupKey].push(group)

        // Only set quest meta/levels if this is a quest
        if (questMeta[groupKey] == null) {
          const pack = quest?.required_adventure_pack
          questMeta[groupKey] = typeof pack === 'string' && pack.trim() ? pack.trim() : null
        }
        if (levels[groupKey] == null) {
          let levelStr = ''
          if (isHeroic) levelStr = `Level ${quest.heroicLevel}`
          else if (isEpic) levelStr = `Level ${quest.epicLevel}`
          else if (quest.level) levelStr = `Level ${quest.level}`
          else if (quest.heroicLevel) levelStr = `Level ${quest.heroicLevel}`
          else if (quest.epicLevel) levelStr = `Level ${quest.epicLevel}`
          levels[groupKey] = levelStr || null
        }

        return
      }

      // Not in quest (and not public/wilderness)
      notInQuest.push(group)
    } else {
      offline.push(group)
    }
  })

  return {
    publicAreaGroups: publicAreas,
    wildernessAreaGroups: wildernessAreas,
    notInQuestGroups: notInQuest,
    questGroups: questsMap,
    questNameToPack: questMeta,
    questLevels: levels,
    wildernessAreaPacks: wildernessPacks,
    offlineGroups: offline,
  }
}
