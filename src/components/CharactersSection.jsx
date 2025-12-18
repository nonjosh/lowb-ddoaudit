import { useState, useEffect, useMemo } from 'react'
import { formatClasses, getPlayerDisplayName } from '../raidLogic'
import { fetchAreasById, fetchQuestsById } from '../ddoAuditApi'
import PlayerCharactersDialog from './PlayerCharactersDialog'
import { 
  Typography, Box, CircularProgress, Skeleton, 
  List, ListItem, ListItemText, ListItemButton, ListSubheader,
  Paper
} from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'

export default function CharactersSection({ loading, hasFetched, charactersById, charactersByPlayer }) {
  const [quests, setQuests] = useState({})
  const [areas, setAreas] = useState({})
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState(null)

  useEffect(() => {
    fetchQuestsById().then(setQuests).catch(console.error)
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  const { onlineByPack, offlineGroups } = useMemo(() => {
    const online = {}
    const offline = []

    // Sort by player name first to ensure consistent order
    const sortedGroups = [...charactersByPlayer].sort((a, b) => 
      getPlayerDisplayName(a.player).localeCompare(getPlayerDisplayName(b.player))
    )

    sortedGroups.forEach((group) => {
      const onlineChar = (group.chars ?? []).find((c) => c?.is_online)
      if (onlineChar) {
        const quest = quests[onlineChar.location_id]
        const pack = quest ? (quest?.required_adventure_pack || 'No Adventure Pack') : 'Not in quest'
        if (!online[pack]) online[pack] = []
        online[pack].push(group)
      } else {
        offline.push(group)
      }
    })

    return { onlineByPack: online, offlineGroups: offline }
  }, [charactersByPlayer, quests])

  const handlePlayerClick = (group) => {
    setSelectedPlayerGroup(group)
  }

  const handleCloseDialog = () => {
    setSelectedPlayerGroup(null)
  }

  const renderPlayerRow = (group) => {
    const onlineChars = (group.chars ?? []).filter((c) => c?.is_online)
    
    let onlineInfo = null
    if (onlineChars.length > 0) {
       onlineInfo = onlineChars.map(c => {
        const questName = quests[c.location_id]?.name
        const areaName = areas[c.location_id]?.name
        const locationName = questName || areaName || 'Unknown Area'
          const classes = formatClasses(c?.classes)
         return `${c.name} (${classes}) @ ${locationName}`
       }).join(', ')
    }

    return (
      <ListItem key={group.player} disablePadding>
        <ListItemButton onClick={() => handlePlayerClick(group)}>
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {getPlayerDisplayName(group.player)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({group.chars.length})
                </Typography>
                {onlineInfo && (
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                    <FiberManualRecordIcon color="success" sx={{ width: 12, height: 12 }} />
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

  const sortedPacks = Object.keys(onlineByPack).sort((a, b) => {
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
          {sortedPacks.map(pack => (
            <Paper key={pack} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
              <ListSubheader sx={{ bgcolor: 'action.hover', lineHeight: '32px', borderBottom: 1, borderColor: 'divider' }}>
                {pack}
              </ListSubheader>
              <List dense disablePadding>
                {onlineByPack[pack].map(renderPlayerRow)}
              </List>
            </Paper>
          ))}
          
          {offlineGroups.length > 0 && (
            <Paper key="offline" variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
              {sortedPacks.length > 0 && (
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
        characters={selectedPlayerGroup?.chars}
      />
    </>
  )
}
