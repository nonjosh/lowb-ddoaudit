import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import PeopleIcon from '@mui/icons-material/People'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '../ddoAuditApi'
import { useCharacter } from '../contexts/CharacterContext'
import { getPlayerDisplayName } from '../raidLogic'
import ClassDisplay from './ClassDisplay'
import PlayerCharactersDialog from './PlayerCharactersDialog'

interface CharactersSectionProps {
  loading: boolean
  hasFetched: boolean
  showClassIcons: boolean
  characterCount: number
}

export default function CharactersSection({ loading, hasFetched, showClassIcons, characterCount }: CharactersSectionProps) {
  const { charactersById, charactersByPlayer } = useCharacter()
  const [quests, setQuests] = useState<Record<string, Quest>>({})
  const [areas, setAreas] = useState<Record<string, { id: string, name: string, is_public: boolean, is_wilderness: boolean }>>({})
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState<PlayerGroup | null>(null)

  useEffect(() => {
    fetchQuestsById().then(setQuests).catch(console.error)
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  const { onlineByQuest, questNameToPack, questLevels, offlineGroups } = useMemo(() => {
    const online: Record<string, PlayerGroup[]> = {}
    const questMeta: Record<string, string | null> = {}
    const levels: Record<string, string | null> = {}
    const offline: PlayerGroup[] = []

    // Sort by player name first to ensure consistent order
    const sortedGroups = [...charactersByPlayer].sort((a, b) =>
      getPlayerDisplayName(a.player).localeCompare(getPlayerDisplayName(b.player))
    )

    sortedGroups.forEach((group) => {
      const onlineChar = (group.chars ?? []).find((c) => c?.is_online)
      if (onlineChar) {
        const quest = quests[onlineChar.location_id]
        let questName = quest?.name || 'Not in quest'
        let isHeroic = false
        let isEpic = false

        if (quest?.name && quest.heroicLevel && quest.epicLevel) {
          const charLevel = (onlineChar.classes || []).reduce((sum: number, cls: any) => sum + (cls.level || 0), 0)
          const distHeroic = Math.abs(charLevel - quest.heroicLevel)
          const distEpic = Math.abs(charLevel - quest.epicLevel)
          if (distHeroic <= distEpic) {
            questName = `${quest.name} (Heroic)`
            isHeroic = true
          } else {
            questName = `${quest.name} (Epic)`
            isEpic = true
          }
        }

        if (!online[questName]) online[questName] = []
        online[questName].push(group)

        if (quest?.name) {
          if (questMeta[questName] == null) {
            const pack = quest?.required_adventure_pack
            questMeta[questName] = typeof pack === 'string' && pack.trim() ? pack.trim() : null
          }
          if (levels[questName] == null) {
            let levelStr = ''
            if (isHeroic) {
              levelStr = `Level ${quest.heroicLevel}`
            } else if (isEpic) {
              levelStr = `Level ${quest.epicLevel}`
            } else if (quest.level) {
              levelStr = `Level ${quest.level}`
            } else if (quest.heroicLevel) {
              levelStr = `Level ${quest.heroicLevel}`
            } else if (quest.epicLevel) {
              levelStr = `Level ${quest.epicLevel}`
            }
            levels[questName] = levelStr || null
          }
        }
      } else {
        offline.push(group)
      }
    })

    return { onlineByQuest: online, questNameToPack: questMeta, questLevels: levels, offlineGroups: offline }
  }, [charactersByPlayer, quests])

  const handlePlayerClick = (group: PlayerGroup) => {
    setSelectedPlayerGroup(group)
  }

  const handleCloseDialog = () => {
    setSelectedPlayerGroup(null)
  }

  const renderPlayerRow = (group: PlayerGroup, showLocation = true) => {
    const onlineChars = (group.chars ?? []).filter((c) => c?.is_online)
    const isOnline = onlineChars.length > 0

    let onlineInfo: React.ReactNode = null
    let locationSuffix: React.ReactNode = null

    if (isOnline) {
      const firstChar = onlineChars[0]
      const questName = quests[firstChar.location_id]?.name
      const areaName = areas[firstChar.location_id]?.name
      // Quest name is already shown in the group header.
      if (!questName && showLocation) {
        locationSuffix = ` @ ${areaName || 'Unknown Area'}`
      }

      onlineInfo = onlineChars
        .map((c, idx) => {
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
        <ListItemButton onClick={() => handlePlayerClick(group)} sx={{ px: 1 }}>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                <FiberManualRecordIcon
                  color={isOnline ? 'success' : 'disabled'}
                  sx={{ width: 12, height: 12 }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {getPlayerDisplayName(group.player)}
                </Typography>
                {onlineInfo && (
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                    <Typography variant="body2" color="success.main" component="span">
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

  const renderNotInQuestGroups = (groups: PlayerGroup[]) => {
    const groupsByArea: Record<string, PlayerGroup[]> = {}
    groups.forEach((group) => {
      const onlineChar = (group.chars ?? []).find((c) => c?.is_online)
      const areaId = onlineChar?.location_id
      const areaName = (areaId && areas[areaId]?.name) || 'Unknown Area'
      if (!groupsByArea[areaName]) groupsByArea[areaName] = []
      groupsByArea[areaName].push(group)
    })

    const sortedAreas = Object.keys(groupsByArea).sort((a, b) => a.localeCompare(b))

    return sortedAreas.map((areaName) => {
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
            <ListSubheader sx={{ lineHeight: '30px', bgcolor: 'inherit', opacity: 0.8, cursor: tooltipTitle ? 'help' : 'default' }}>
              {areaName}
            </ListSubheader>
          </Tooltip>
          {groupsByArea[areaName].map((g) => renderPlayerRow(g, false))}
        </Box>
      )
    })
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon />
          <Typography variant="h5" sx={{ mb: 0 }}>Characters</Typography>
        </Box>
        <Chip label={characterCount} size="small" variant="outlined" />
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
                  const levelInfo = questLevels[questName]
                  const showPackLine = questName !== 'Not in quest' && (!!packName || !!levelInfo)

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
                            {[levelInfo, packName].filter(Boolean).join(' • ')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )
                })()}
              </ListSubheader>
              <List dense disablePadding>
                {questName === 'Not in quest'
                  ? renderNotInQuestGroups(onlineByQuest[questName])
                  : onlineByQuest[questName].map((g) => renderPlayerRow(g))}
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
                {offlineGroups.map((g) => renderPlayerRow(g))}
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
        showClassIcons={showClassIcons}
      />
    </>
  )
}
