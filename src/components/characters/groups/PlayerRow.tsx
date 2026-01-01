import { Quest } from '@/api/ddoAudit'
import { PlayerGroup } from '@/contexts/CharacterContext'
import { getPlayerDisplayName } from '@/domains/raids/raidLogic'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import GroupsIcon from '@mui/icons-material/Groups'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { Box, ListItem, ListItemButton, ListItemText, Tooltip, Typography } from '@mui/material'
import ClassDisplay from '../../shared/ClassDisplay'

interface PlayerRowProps {
  group: PlayerGroup
  showLocation?: boolean
  showClassIcons: boolean
  quests: Record<string, Quest>
  areas: Record<string, { id: string; name: string; is_public: boolean; is_wilderness: boolean }>
  lfmByCharacterName: Map<string, any>
  onPlayerClick: (group: PlayerGroup) => void
  onLfmClick: (lfm: any) => void
}

/**
 * Renders a single player row in the characters list.
 * Shows online status, character info, party/LFM status, and location.
 */
export default function PlayerRow({
  group,
  showLocation = true,
  showClassIcons,
  quests,
  areas,
  lfmByCharacterName,
  onPlayerClick,
  onLfmClick,
}: PlayerRowProps) {
  const onlineChars = (group.chars ?? []).filter((c) => c?.is_online)
  const isOnline = onlineChars.length > 0

  let onlineInfo: React.ReactNode = null
  let locationSuffix: React.ReactNode = null
  let isInParty = false
  let isInLfm = false
  let lfmForCharacter: any = null

  if (isOnline) {
    const firstChar = onlineChars[0]
    const questName = quests[firstChar.location_id]?.name
    const areaName = areas[firstChar.location_id]?.name
    // Quest name is already shown in the group header.
    if (!questName && showLocation) {
      locationSuffix = ` @ ${areaName || 'Unknown Area'}`
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
          {c.name} (<ClassDisplay classes={c.classes} showIcons={showClassIcons} iconSize={20} />)
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
