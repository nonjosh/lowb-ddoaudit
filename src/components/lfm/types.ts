import { RaidEntry } from '@/domains/raids/raidLogic'

export interface LfmParticipant {
  characterName: string
  playerName: string
  playerDisplayName: string
  guildName: string
  totalLevel: number | null
  classesDisplay: string
  classes: Array<{ name: string; level: number }>
  isLeader: boolean
  race: string
  location_id: number
}

export interface LfmGroup {
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
  postedAt?: string | null
  comment: string
}

interface RaidGroup {
  questId: string
  raidName: string
  adventurePack?: string | null
  questLevel: number | null
  entries: unknown[]
}

interface PlayerGroup {
  player: string
  entries: RaidEntry[]
}

export interface LfmParticipantsDialogProps {
  selectedLfm: LfmGroup | null
  onClose: () => void
  selectedRaidData: { raidGroup: RaidGroup; perPlayerEligible: PlayerGroup[] } | null
}