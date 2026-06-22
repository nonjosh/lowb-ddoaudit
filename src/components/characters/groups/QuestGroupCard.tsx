import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import { Box, List, ListSubheader, Paper, Typography } from '@mui/material'
import { useMemo, useState } from 'react'

import { Quest } from '@/api/ddoAudit'
import ItemLootDialog from '@/components/items/ItemLootDialog'
import { PlayerGroup } from '@/contexts/useCharacter'
import { LfmDisplayData } from '@/domains/lfm/lfmHelpers'

import PlayerRow from './PlayerRow'

interface QuestGroupCardProps {
  questName: string
  groups: PlayerGroup[]
  packName: string | null
  levelInfo: string | null
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, LfmDisplayData>
  getLocationDuration?: (characterId: string) => number | null
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: LfmDisplayData) => void
}

/**
 * Renders a card for a single quest with all players currently in that quest.
 */
export default function QuestGroupCard({
  questName,
  groups,
  packName,
  levelInfo,
  quests,
  areas,
  lfmByCharacterName,
  getLocationDuration,
  onPlayerClick,
  onLfmClick,
}: QuestGroupCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const showPackLine = !!packName || !!levelInfo
  const normalizedQuestName = questName.replace(/ \((Heroic|Epic)\)$/, '')
  const locationIds = useMemo(
    () => Array.from(
      new Set(
        groups.flatMap((group) =>
          group.chars
            .filter((character) => character?.is_online && character.location_id)
            .map((character) => String(character.location_id)),
        ),
      ),
    ),
    [groups],
  )
  const matchingQuestInfo = useMemo(
    () => locationIds
      .map((locationId) => quests[locationId])
      .find((quest) => quest?.name === normalizedQuestName) ?? null,
    [locationIds, normalizedQuestName, quests],
  )

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'info.main' }}>
      <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1, cursor: 'pointer' }} onClick={() => setDialogOpen(true)}>
        <Box sx={{ display: 'flex', alignItems: showPackLine ? 'flex-start' : 'center', gap: 1 }}>
          <EmojiEventsOutlinedIcon sx={{ fontSize: 18, mt: showPackLine ? '2px' : 0 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                {questName.replace(/ \((Heroic|Epic)\)$/, '')}
              </Typography>
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
            quests={quests}
            areas={areas}
            lfmByCharacterName={lfmByCharacterName}
            getLocationDuration={getLocationDuration}
            onPlayerClick={onPlayerClick}
            onLfmClick={onLfmClick}
          />
        ))}
      </List>
      <ItemLootDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        questName={normalizedQuestName}
        questId={matchingQuestInfo?.id ?? null}
        areaId={matchingQuestInfo?.areaId ?? null}
        locationIds={locationIds}
        showLocationPlayersToggle={true}
      />
    </Paper>
  )
}
