export interface LfmParticipant {
  characterName: string
  playerName: string
  playerDisplayName: string
  guildName: string
  totalLevel: number | null
  classesDisplay: string
  classes?: any[]
  isLeader: boolean
  race?: string
  location_id: number
}

export interface LfmGroup {
  questName: string
  adventurePack?: string | null
  areaId: string
  questLevel: number | null
  adventureActiveMinutes?: number | null
  difficultyDisplay: string
  difficultyColor: string
  participants: LfmParticipant[]
  maxPlayers?: number
  isRaid: boolean
  questId: string
  postedAt?: string | null
}

export interface LfmParticipantsDialogProps {
  selectedLfm: LfmGroup | null
  onClose: () => void
  selectedRaidData: { raidGroup: any; perPlayerEligible: any[] } | null
}