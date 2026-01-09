import { RaidGroup, PlayerGroup } from '@/domains/raids/raidLogic'
import { LfmDisplayData } from '@/domains/lfm/lfmHelpers'

export interface LfmParticipantsDialogProps {
  selectedLfm: LfmDisplayData | null
  onClose: () => void
  selectedRaidData: { raidGroup: RaidGroup; perPlayerEligible: PlayerGroup[] } | null
}