import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import GroupsIcon from '@mui/icons-material/Groups'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { Box, ListItem, ListItemButton, ListItemText, Tooltip, Typography } from '@mui/material'
import { ReactNode } from 'react'

import { Quest } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { PlayerGroup } from '@/contexts/useCharacter'
import { useConfig } from '@/contexts/useConfig'
import { LfmDisplayData } from '@/domains/lfm/lfmHelpers'
import { getPlayerDisplayName } from '@/domains/raids/raidLogic'
import { formatDuration } from '@/hooks/useLocationTracking'

interface PlayerRowProps {
  group: PlayerGroup
  showLocation?: boolean
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, LfmDisplayData>
  getLocationDuration?: (characterId: string) => number | null
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: LfmDisplayData) => void
}

/**
 * Renders a single player row in the characters list.
 * Shows online status, character info, party/LFM status, and location.
 */
export default function PlayerRow({
  group,
  showLocation = true,
  quests,
  areas,
  lfmByCharacterName,
  getLocationDuration,
  onPlayerClick,
  onLfmClick,
}: PlayerRowProps) {
  const { showClassIcons } = useConfig()
  const onlineChars = (group.chars ?? []).filter((c) => c?.is_online)
  const isOnline = onlineChars.length > 0

  let onlineInfo: ReactNode = null
  let locationSuffix: ReactNode = null
  let isInParty = false
  let isInLfm = false
  let lfmForCharacter: LfmDisplayData | undefined = undefined
  let durationDisplay: ReactNode = null

  if (isOnline) {
    const firstChar = onlineChars[0]
    const questName = firstChar.location_id ? quests[firstChar.location_id]?.name : undefined
    const areaName = firstChar.location_id ? areas[firstChar.location_id]?.name : undefined
    // Quest name is already shown in the group header.
    if (!questName && showLocation) {
      locationSuffix = ` @ ${areaName || 'Unknown Area'}`
    }

    // Calculate duration for the first online character
    if (getLocationDuration && firstChar.id) {
      const durationMs = getLocationDuration(firstChar.id)
      const formatted = formatDuration(durationMs)
      if (formatted) {
        durationDisplay = (
          <Tooltip title="Time in current area">
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, ml: 1, color: 'text.secondary' }}>
              <AccessTimeIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" component="span">
                {formatted}
              </Typography>
            </Box>
          </Tooltip>
        )
      }
    }

    isInParty = onlineChars.some((c) => c.group_id || c.is_in_party)
    const charInLfm = onlineChars.find((c) => lfmByCharacterName.has(c.name))
    if (charInLfm) {
      lfmForCharacter = lfmByCharacterName.get(charInLfm.name)
      isInLfm = true
    }

    onlineInfo = onlineChars.map((c, idx) => {
      return (
        <span key={c.name}>
          {c.name} (<ClassDisplay classes={c.classes} showIcons={showClassIcons} iconSize={20} />){c.total_level !== 34 ? ` Lv${c.total_level}` : ''}
          {idx < onlineChars.length - 1 ? ', ' : ''}
        </span>
      )
    })
  }

  return (
    <ListItem key={group.player} disablePadding>
      <ListItemButton onClick={() => onPlayerClick(group)} sx={{ px: 1 }}>
        <ListItemText
          primary={
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <FiberManualRecordIcon
                  color={isOnline ? 'success' : 'disabled'}
                  sx={{ width: 12, height: 12 }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {getPlayerDisplayName(group.player)}
                </Typography>
                {isInParty && (
                  <Tooltip title="In Party">
                    <GroupsIcon color="action" sx={{ width: 16, height: 16 }} />
                  </Tooltip>
                )}
                {isInLfm && (
                  <Tooltip title="In LFM (Click to view)">
                    <ListAltIcon
                      color="action"
                      sx={{ width: 16, height: 16, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (lfmForCharacter) onLfmClick(lfmForCharacter)
                      }}
                    />
                  </Tooltip>
                )}
                {durationDisplay}
              </Box>
              {onlineInfo && (
                <Box sx={{ ml: 2.5 }}>
                  <Typography variant="body2" color="success.main">
                    {onlineInfo}
                  </Typography>
                </Box>
              )}
            </Box>
          }
          secondary={
            locationSuffix && (
              <Typography variant="caption" color="text.secondary" component="div" sx={{ ml: 1 }}>
                {locationSuffix}
              </Typography>
            )
          }
        />
      </ListItemButton>
    </ListItem>
  )
}
