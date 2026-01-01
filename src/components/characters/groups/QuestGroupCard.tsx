import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import { Box, List, ListSubheader, Paper, Typography } from '@mui/material'
import { Quest } from '../../../api/ddoAudit'
import { PlayerGroup } from '../../../contexts/CharacterContext'
import ItemLootButton from '../../items/ItemLootButton'
import PlayerRow from './PlayerRow'

interface QuestGroupCardProps {
  questName: string
  groups: PlayerGroup[]
  packName: string | null
  levelInfo: string | null
  showClassIcons: boolean
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, any>
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: any) => void
}

/**
 * Renders a card for a single quest with all players currently in that quest.
 */
export default function QuestGroupCard({
  questName,
  groups,
  packName,
  levelInfo,
  showClassIcons,
  quests,
  areas,
  lfmByCharacterName,
  onPlayerClick,
  onLfmClick,
}: QuestGroupCardProps) {
  const showPackLine = !!packName || !!levelInfo

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'info.main' }}>
      <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: showPackLine ? 'flex-start' : 'center', gap: 1 }}>
          <EmojiEventsOutlinedIcon sx={{ fontSize: 18, mt: showPackLine ? '2px' : 0 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                {questName.replace(/ \((Heroic|Epic)\)$/, '')}
              </Typography>
              <ItemLootButton questName={questName.replace(/ \((Heroic|Epic)\)$/, '')} />
            </Box>
            {levelInfo && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {levelInfo}
              </Typography>
            )}
            {packName && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                {packName}
              </Typography>
            )}
          </Box>
        </Box>
      </ListSubheader>
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
