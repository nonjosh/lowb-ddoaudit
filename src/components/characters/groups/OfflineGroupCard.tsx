import { Quest } from '@/api/ddoAudit'
import { PlayerGroup } from '@/contexts/CharacterContext'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import { Box, List, ListSubheader, Paper } from '@mui/material'
import PlayerRow from './PlayerRow'

interface OfflineGroupCardProps {
  groups: PlayerGroup[]
  showClassIcons: boolean
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, any>
  showHeader: boolean
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: any) => void
}

/**
 * Renders a card for offline players.
 */
export default function OfflineGroupCard({
  groups,
  showClassIcons,
  quests,
  areas,
  lfmByCharacterName,
  showHeader,
  onPlayerClick,
  onLfmClick,
}: OfflineGroupCardProps) {
  if (groups.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'text.disabled' }}>
      {showHeader && (
        <ListSubheader
          sx={{ bgcolor: 'action.hover', lineHeight: '32px', borderBottom: 1, borderColor: 'divider' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
            Offline
          </Box>
        </ListSubheader>
      )}
      <List dense disablePadding>
        {groups.map((g) => (
          <PlayerRow
            key={g.player}
            group={g}
            showLocation={true}
            showClassIcons={showClassIcons}
            quests={quests}
            areas={areas}
            lfmByCharacterName={lfmByCharacterName}
            onPlayerClick={onPlayerClick}
            onLfmClick={onLfmClick}
          />
        ))}
      </List>
    </Paper>
  )
}
