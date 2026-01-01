import { Quest } from '../../api/ddoAudit'
import { getEffectiveLevel, isRaidQuest, parseReaperSkulls } from '../quests/questHelpers'
import { formatClasses, getPlayerDisplayName, getPlayerName } from '../raids/raidLogic'

export interface LfmParticipant {
  characterName: string
  playerName: string
  playerDisplayName: string
  guildName: string
  totalLevel: number | null
  classesDisplay: string
  classes: any
  isLeader: boolean
  race: string
}

export interface PreparedLfmData {
  questName: string
  adventurePack?: string | null
  questLevel: number | null
  adventureActiveMinutes?: number | null
  difficultyDisplay: string
  difficultyColor: string
  participants: LfmParticipant[]
  maxPlayers: number
}

/**
 * Prepares LFM data for display in the participants dialog.
 * Extracts and formats all participant information including classes, levels, guilds, etc.
 */
export function prepareLfmParticipants(lfm: any, quest: Quest | null): PreparedLfmData {
  const isRaid = isRaidQuest(quest)
  const maxPlayers = isRaid ? 12 : 6

  const participants: LfmParticipant[] = [lfm?.leader, ...(lfm?.members ?? [])]
    .filter(Boolean)
    .map((p: any) => {
      const characterName = String(p?.name ?? '').trim() || '—'
      const playerName = getPlayerName(characterName)
      const classesDisplay = formatClasses(p?.classes)
      return {
        characterName,
        playerName,
        playerDisplayName: getPlayerDisplayName(playerName),
        guildName: String(p?.guild_name ?? '').trim() || '',
        totalLevel: typeof p?.total_level === 'number' ? p.total_level : null,
        classesDisplay,
        classes: p?.classes,
        isLeader: Boolean(lfm?.leader?.id && p?.id && p.id === lfm.leader.id),
        race: p?.race ?? 'Unknown',
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
    adventurePack: quest?.required_adventure_pack,
    questLevel: getEffectiveLevel(lfm, quest),
    adventureActiveMinutes,
    difficultyDisplay,
    difficultyColor,
    participants,
    maxPlayers,
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

/**
 * Creates a map of character names to their associated LFMs.
 */
export function createLfmByCharacterNameMap(lfms: Record<string, any>): Map<string, any> {
  const map = new Map<string, any>()
  Object.values(lfms || {}).forEach((lfm: any) => {
    if (lfm.leader?.name) map.set(lfm.leader.name, lfm)
    if (Array.isArray(lfm.members)) {
      lfm.members.forEach((m: any) => {
        if (m.name) map.set(m.name, lfm)
      })
    }
  })
  return map
}
