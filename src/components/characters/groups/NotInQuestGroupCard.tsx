import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import { Box, List, ListSubheader, Paper, Tooltip, Typography } from '@mui/material'

import { Quest } from '@/api/ddoAudit'
import { PlayerGroup } from '@/contexts/CharacterContext'

import PlayerRow from './PlayerRow'

interface NotInQuestGroupCardProps {
  groups: PlayerGroup[]
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, any>
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: Record<string, unknown>) => void
}

/**
 * Renders a card for characters that are online but not in a categorized location
 * (not in public areas, wilderness, or recognized quests).
 */
export default function NotInQuestGroupCard({
  groups,
  quests,
  areas,
  lfmByCharacterName,
  onPlayerClick,
  onLfmClick,
}: NotInQuestGroupCardProps) {
  if (groups.length === 0) return null

  // Group by area name
  const groupsByArea: Record<string, PlayerGroup[]> = {}
  groups.forEach((group) => {
    const onlineChar = (group.chars ?? []).find((c) => c?.is_online)
    const areaId = onlineChar?.location_id
    const areaName = (areaId && areas[areaId]?.name) || 'Unknown Area'
    if (!groupsByArea[areaName]) groupsByArea[areaName] = []
    groupsByArea[areaName].push(group)
  })

  const sortedAreas = Object.keys(groupsByArea).sort((a, b) => a.localeCompare(b))

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'success.main' }}>
      <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2">Not in quest</Typography>
        </Box>
      </ListSubheader>
      <List dense disablePadding>
        {sortedAreas.map((areaName) => {
          const firstGroup = groupsByArea[areaName][0]
          const onlineChar = (firstGroup.chars ?? []).find((c) => c?.is_online)
          const areaId = onlineChar?.location_id
          const area = areaId ? areas[areaId] : null

          let tooltipTitle = ''
          if (area?.is_public) tooltipTitle = 'Public Area'
          else if (area?.is_wilderness) tooltipTitle = 'Wilderness'

          return (
            <Box key={areaName}>
              <Tooltip title={tooltipTitle} arrow placement="top">
                <ListSubheader
                  sx={{
                    lineHeight: '30px',
                    bgcolor: 'inherit',
                    opacity: 0.8,
                    cursor: tooltipTitle ? 'help' : 'default',
                  }}
                >
                  {areaName}
                </ListSubheader>
              </Tooltip>
              {groupsByArea[areaName].map((g) => (
                <PlayerRow
                  key={g.player}
                  group={g}
                  showLocation={false}
                  quests={quests}
                  areas={areas}
                  lfmByCharacterName={lfmByCharacterName}
                  onPlayerClick={onPlayerClick}
                  onLfmClick={onLfmClick}
                />
              ))}
            </Box>
          )
        })}
      </List>
    </Paper>
  )
}
