import { RaidGroup, PlayerGroup } from '@/domains/raids/raidLogic'
import { NormalizedLfm } from '@/domains/lfm/lfmHelpers'

export interface LfmParticipantsDialogProps {
  selectedLfm: NormalizedLfm | null
  onClose: () => void
  selectedRaidData: { raidGroup: RaidGroup; perPlayerEligible: PlayerGroup[] } | null
}