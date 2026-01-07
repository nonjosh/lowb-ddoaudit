import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import { Box, List, ListSubheader, Paper, Tooltip, Typography } from '@mui/material'

import { Quest } from '@/api/ddoAudit'
import { PlayerGroup } from '@/contexts/CharacterContext'

import PlayerRow from './PlayerRow'

interface LocationGroupCardProps {
  title: string
  groups: Record<string, PlayerGroup[]>
  borderColor: string
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, Record<string, unknown>>
  packsByAreaName?: Record<string, string | null>
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: Record<string, unknown>) => void
}

/**
 * Renders a card containing grouped locations (public areas or wilderness areas).
 * Each location has its own subheader with multiple player rows.
 */
export default function LocationGroupCard({
  title,
  groups,
  borderColor,
  quests,
  areas,
  lfmByCharacterName,
  packsByAreaName,
  onPlayerClick,
  onLfmClick,
}: LocationGroupCardProps) {
  const sortedAreaNames = Object.keys(groups).sort((a, b) => a.localeCompare(b))

  if (sortedAreaNames.length === 0) return null

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor }}>
      <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
          </Box>
        </Box>
      </ListSubheader>
      <List dense disablePadding>
        {sortedAreaNames.map((areaName) => {
          const packName = packsByAreaName?.[areaName] ?? null
          const header = (
            <ListSubheader sx={{ lineHeight: '30px', bgcolor: 'inherit', opacity: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2">{areaName}</Typography>
              </Box>
            </ListSubheader>
          )

          return (
            <Box key={areaName}>
              {packName ? (
                <Tooltip title={packName} arrow placement="top">
                  {header}
                </Tooltip>
              ) : (
                header
              )}
              {(groups[areaName] || []).map((g) => (
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
