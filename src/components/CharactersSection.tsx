import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'

import { fetchAreasById, fetchQuestsById, Quest } from '../ddoAuditApi'
import { formatClasses, getPlayerDisplayName } from '../raidLogic'
import PlayerCharactersDialog from './PlayerCharactersDialog'

interface Character {
  name: string
  is_online: boolean
  location_id: string
  classes: any[]
}

interface PlayerGroup {
  player: string
  chars: Character[]
}

interface CharactersSectionProps {
  loading: boolean
  hasFetched: boolean
  charactersById: Record<string, any>
  charactersByPlayer: PlayerGroup[]
  isPlayerCollapsed: (playerName: string) => boolean
  togglePlayerCollapsed: (playerName: string) => void
}

export default function CharactersSection({ loading, hasFetched, charactersById, charactersByPlayer }: CharactersSectionProps) {
  const [quests, setQuests] = useState<Record<string, Quest>>({})
  const [areas, setAreas] = useState<Record<string, { id: string, name: string }>>({})
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState<PlayerGroup | null>(null)

  useEffect(() => {
    fetchQuestsById().then(setQuests).catch(console.error)
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  const { onlineByQuest, questNameToPack, offlineGroups } = useMemo(() => {
    const online: Record<string, PlayerGroup[]> = {}
    const questMeta: Record<string, string | null> = {}
    const offline: PlayerGroup[] = []

    // Sort by player name first to ensure consistent order
    const sortedGroups = [...charactersByPlayer].sort((a, b) => 
      getPlayerDisplayName(a.player).localeCompare(getPlayerDisplayName(b.player))
    )

    sortedGroups.forEach((group) => {
      const onlineChar = (group.chars ?? []).find((c) => c?.is_online)
      if (onlineChar) {
        const quest = quests[onlineChar.location_id]
        const questName = quest?.name || 'Not in quest'
        if (!online[questName]) online[questName] = []
        online[questName].push(group)

        if (quest?.name && questMeta[questName] == null) {
          const pack = quest?.required_adventure_pack
          questMeta[questName] = typeof pack === 'string' && pack.trim() ? pack.trim() : null
        }
      } else {
        offline.push(group)
      }
    })

    return { onlineByQuest: online, questNameToPack: questMeta, offlineGroups: offline }
  }, [charactersByPlayer, quests])

  const handlePlayerClick = (group: PlayerGroup) => {
    setSelectedPlayerGroup(group)
  }

  const handleCloseDialog = () => {
    setSelectedPlayerGroup(null)
  }

  const renderPlayerRow = (group: PlayerGroup) => {
    const onlineChars = (group.chars ?? []).filter((c) => c?.is_online)
    const isOnline = onlineChars.length > 0
    
    let onlineInfo = null
    if (isOnline) {
      onlineInfo = onlineChars
        .map((c) => {
          const questName = quests[c.location_id]?.name
          const areaName = areas[c.location_id]?.name
          const classes = formatClasses(c?.classes)

          // Quest name is already shown in the group header.
          if (questName) return `${c.name} (${classes})`

          const locationName = areaName || 'Unknown Area'
          return `${c.name} (${classes}) @ ${locationName}`
        })
        .join(', ')
    }

    return (
      <ListItem key={group.player} disablePadding>
        <ListItemButton onClick={() => handlePlayerClick(group)}>
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {getPlayerDisplayName(group.player)}
                </Typography>
                {isOnline && (
                  <FiberManualRecordIcon color="success" sx={{ width: 12, height: 12 }} />
                )}
                <Typography variant="caption" color="text.secondary">
                  ({group.chars.length})
                </Typography>
                {onlineInfo && (
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                    <Typography variant="caption" color="success.main">
                      {onlineInfo}
                    </Typography>
                  </Box>
                )}
              </Box>
            }
          />
        </ListItemButton>
      </ListItem>
    )
  }

  const sortedQuests = Object.keys(onlineByQuest).sort((a, b) => {
    if (a === b) return 0
    if (a === 'Not in quest') return -1
    if (b === 'Not in quest') return 1
    return a.localeCompare(b)
  })

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>Characters</Typography>
        {loading && <CircularProgress size={20} />}
      </Box>

      {Object.keys(charactersById ?? {}).length ? (
        <Box sx={{ mt: 2 }}>
          {sortedQuests.map((questName) => (
            <Paper
              key={questName}
              variant="outlined"
              sx={{
                mb: 2,
                overflow: 'hidden',
                borderColor: questName === 'Not in quest' ? 'success.main' : 'info.main',
              }}
            >
              <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
                {(() => {
                  const packName = questNameToPack[questName]
                  const showPackLine = questName !== 'Not in quest' && !!packName

                  return (
                    <Box sx={{ display: 'flex', alignItems: showPackLine ? 'flex-start' : 'center', gap: 1 }}>
                      {questName === 'Not in quest' ? (
                        <PlaceOutlinedIcon sx={{ fontSize: 18, mt: showPackLine ? '2px' : 0 }} />
                      ) : (
                        <LocalOfferOutlinedIcon sx={{ fontSize: 18, mt: showPackLine ? '2px' : 0 }} />
                      )}
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                      {questName}
                    </Typography>
                    {showPackLine && (
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                        {packName}
                      </Typography>
                    )}
                  </Box>
                    </Box>
                  )
                })()}
              </ListSubheader>
              <List dense disablePadding>
                {onlineByQuest[questName].map(renderPlayerRow)}
              </List>
            </Paper>
          ))}
          
          {offlineGroups.length > 0 && (
            <Paper
              key="offline"
              variant="outlined"
              sx={{ mb: 2, overflow: 'hidden', borderColor: 'text.disabled' }}
            >
              {sortedQuests.length > 0 && (
                <ListSubheader sx={{ bgcolor: 'action.hover', lineHeight: '32px', borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
                    Offline
                  </Box>
                </ListSubheader>
              )}
              <List dense disablePadding>
                {offlineGroups.map(renderPlayerRow)}
              </List>
            </Paper>
          )}
        </Box>
      ) : (loading || !hasFetched) ? (
        <Box sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No character data found.
        </Typography>
      )}

      <PlayerCharactersDialog
        open={!!selectedPlayerGroup}
        onClose={handleCloseDialog}
        playerName={selectedPlayerGroup ? getPlayerDisplayName(selectedPlayerGroup.player) : ''}
        characters={selectedPlayerGroup?.chars ?? []}
      />
    </>
  )
}
