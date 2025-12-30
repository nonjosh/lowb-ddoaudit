import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import GroupsIcon from '@mui/icons-material/Groups'
import ListAltIcon from '@mui/icons-material/ListAlt'
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

import { fetchAreasById, fetchQuestsById, Quest } from '../../api/ddoAudit'
import { PlayerGroup, useCharacter } from '../../contexts/CharacterContext'
import { formatClasses, getPlayerDisplayName, getPlayerName } from '../../domains/raids/raidLogic'
import LfmParticipantsDialog from '../lfm/LfmParticipantsDialog'
import ClassDisplay from '../shared/ClassDisplay'
import PlayerCharactersDialog from './PlayerCharactersDialog'

interface CharactersSectionProps {
  loading: boolean
  hasFetched: boolean
  showClassIcons: boolean
  characterCount: number
}

function parseReaperSkulls(text: string | null) {
  const s = String(text ?? '')
  if (!s) return null
  const re = /\b(?:r|reaper)\s*([1-9]|10)\b/gi
  let m
  let best = null
  while ((m = re.exec(s))) {
    const n = Number.parseInt(m[1], 10)
    if (!Number.isFinite(n)) continue
    best = best === null ? n : Math.max(best, n)
  }
  return best
}

function isRaidQuest(quest: Quest | null) {
  const type = String(quest?.type ?? '').trim().toLowerCase()
  return type.includes('raid')
}

function getEffectiveLevel(lfm: any, quest: Quest | null) {
  const leaderLevel = lfm?.leader?.total_level
  const heroicLevel = quest?.heroicLevel
  const epicLevel = quest?.epicLevel

  if (typeof heroicLevel === 'number' && typeof epicLevel === 'number') {
    if (typeof leaderLevel === 'number' && leaderLevel >= 20) return epicLevel
    return heroicLevel
  }
  if (typeof epicLevel === 'number') return epicLevel
  if (typeof heroicLevel === 'number') return heroicLevel

  const questLevel = quest?.level
  if (typeof questLevel === 'number') return questLevel

  const max = lfm?.maximum_level
  if (typeof max === 'number') return max
  const min = lfm?.minimum_level
  if (typeof min === 'number') return min

  return null
}

export default function CharactersSection({ loading, hasFetched, showClassIcons, characterCount }: CharactersSectionProps) {
  const { charactersById, charactersByPlayer, lfms } = useCharacter()
  const [quests, setQuests] = useState<Record<string, Quest>>({})
  const [areas, setAreas] = useState<Record<string, { id: string, name: string, is_public: boolean, is_wilderness: boolean }>>({})
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState<PlayerGroup | null>(null)
  const [selectedLfm, setSelectedLfm] = useState<any | null>(null)

  useEffect(() => {
    fetchQuestsById().then(setQuests).catch(console.error)
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  const lfmByCharacterName = useMemo(() => {
    const map = new Map<string, any>()
    Object.values(lfms || {}).forEach((lfm: any) => {
      if (lfm.leader?.name) map.set(lfm.leader.name, lfm)
      if (Array.isArray(lfm.members)) {
        lfm.members.forEach((m: any) => {
          if (m.name) map.set(m.name, lfm)
        })
      }
    })
    return map
  }, [lfms])

  const handleLfmClick = (lfm: any) => {
    const questId = String(lfm?.quest_id ?? '')
    const quest = quests[questId] ?? null
    const isRaid = isRaidQuest(quest)
    const maxPlayers = isRaid ? 12 : 6

    const participants = [lfm?.leader, ...(lfm?.members ?? [])]
      .filter(Boolean)
      .map((p: any) => {
        const characterName = String(p?.name ?? '').trim() || '—'
        const playerName = getPlayerName(characterName)
        const classesDisplay = formatClasses(p?.classes)
        return {
          characterName,
          playerName,
          playerDisplayName: getPlayerDisplayName(playerName),
          guildName: String(p?.guild_name ?? '').trim() || '',
          totalLevel: typeof p?.total_level === 'number' ? p.total_level : null,
          classesDisplay,
          classes: p?.classes,
          isLeader: Boolean(lfm?.leader?.id && p?.id && p.id === lfm.leader.id),
          race: p?.race ?? 'Unknown',
        }
      })

    const difficulty = String(lfm?.difficulty ?? '').trim() || '—'
    const comment = String(lfm?.comment ?? '').trim() || ''
    const reaperSkulls = difficulty.toLowerCase() === 'reaper' ? parseReaperSkulls(comment) : null
    const difficultyDisplay =
      difficulty.toLowerCase() === 'reaper' && typeof reaperSkulls === 'number'
        ? `Reaper ${reaperSkulls}`
        : difficulty

    const difficultyColor = (() => {
      const d = difficulty.toLowerCase()
      if (d === 'reaper') return 'error.main'
      if (d === 'elite') return 'warning.main'
      if (d === 'hard') return 'info.main'
      return 'text.primary'
    })()

    setSelectedLfm({
      questName: quest?.name || 'Unknown Quest',
      adventurePack: quest?.required_adventure_pack,
      questLevel: getEffectiveLevel(lfm, quest),
      difficultyDisplay,
      difficultyColor,
      participants,
      maxPlayers,
    })
  }

  const {
    publicAreaGroups,
    wildernessAreaGroups,
    notInQuestGroups,
    questGroups,
    questNameToPack,
    questLevels,
    wildernessAreaPacks,
    offlineGroups,
  } = useMemo(() => {
    const publicAreas: Record<string, PlayerGroup[]> = {}
    const wildernessAreas: Record<string, PlayerGroup[]> = {}
    const wildernessPacks: Record<string, string | null> = {}
    const notInQuest: PlayerGroup[] = []
    const questsMap: Record<string, PlayerGroup[]> = {}
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
        const area = areas[onlineChar.location_id]
        const quest = quests[onlineChar.location_id]

        // Public areas first
        if (area && area.is_public) {
          const name = area.name || 'Unknown Area'
          if (!publicAreas[name]) publicAreas[name] = []
          publicAreas[name].push(group)
          return
        }

        // Wilderness areas next
        if (area && area.is_wilderness) {
          const name = area.name || 'Unknown Area'
          if (!wildernessAreas[name]) wildernessAreas[name] = []
          wildernessAreas[name].push(group)
          // try to capture an adventure pack for this wilderness (if available via quest mapping)
          const pack = quest?.required_adventure_pack
          if (wildernessPacks[name] == null) {
            wildernessPacks[name] = typeof pack === 'string' && pack.trim() ? pack.trim() : null
          }
          return
        }

        // Quests (one group per quest)
        if (quest?.name) {
          let groupKey = quest.name
          let isHeroic = false
          let isEpic = false

          if (quest.heroicLevel && quest.epicLevel) {
            const charLevel = (onlineChar.classes || []).reduce((sum: number, cls: any) => sum + (cls.level || 0), 0)
            const distHeroic = Math.abs(charLevel - quest.heroicLevel)
            const distEpic = Math.abs(charLevel - quest.epicLevel)
            if (distHeroic <= distEpic) {
              groupKey = `${quest.name} (Heroic)`
              isHeroic = true
            } else {
              groupKey = `${quest.name} (Epic)`
              isEpic = true
            }
          }

          if (!questsMap[groupKey]) questsMap[groupKey] = []
          questsMap[groupKey].push(group)

          // Only set quest meta/levels if this is a quest
          if (questMeta[groupKey] == null) {
            const pack = quest?.required_adventure_pack
            questMeta[groupKey] = typeof pack === 'string' && pack.trim() ? pack.trim() : null
          }
          if (levels[groupKey] == null) {
            let levelStr = ''
            if (isHeroic) levelStr = `Level ${quest.heroicLevel}`
            else if (isEpic) levelStr = `Level ${quest.epicLevel}`
            else if (quest.level) levelStr = `Level ${quest.level}`
            else if (quest.heroicLevel) levelStr = `Level ${quest.heroicLevel}`
            else if (quest.epicLevel) levelStr = `Level ${quest.epicLevel}`
            levels[groupKey] = levelStr || null
          }

          return
        }

        // Not in quest (and not public/wilderness)
        notInQuest.push(group)
      } else {
        offline.push(group)
      }
    })

    return {
      publicAreaGroups: publicAreas,
      wildernessAreaGroups: wildernessAreas,
      notInQuestGroups: notInQuest,
      questGroups: questsMap,
      questNameToPack: questMeta,
      questLevels: levels,
      wildernessAreaPacks: wildernessPacks,
      offlineGroups: offline,
    }
  }, [charactersByPlayer, quests, areas])

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
                          if (lfmForCharacter) handleLfmClick(lfmForCharacter)
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

  // Prepare sorted keys for each category
  const sortedPublicAreas = Object.keys(publicAreaGroups || {}).sort((a, b) => a.localeCompare(b))
  const sortedWildernessAreas = Object.keys(wildernessAreaGroups || {}).sort((a, b) => a.localeCompare(b))
  const sortedQuestNames = Object.keys(questGroups || {}).sort((a, b) => a.localeCompare(b))

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
          {/* Public areas: single top-level panel with per-area subgroups */}
          {sortedPublicAreas.length > 0 && (
            <Paper key="public-areas" variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'success.main' }}>
              <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>Public Areas</Typography>
                  </Box>
                </Box>
              </ListSubheader>
              <List dense disablePadding>
                {sortedPublicAreas.map((areaName) => (
                  <Box key={`public-sub-${areaName}`}>
                    <ListSubheader sx={{ lineHeight: '30px', bgcolor: 'inherit', opacity: 0.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{areaName}</Typography>
                      </Box>
                    </ListSubheader>
                    {(publicAreaGroups[areaName] || []).map((g) => renderPlayerRow(g, false))}
                  </Box>
                ))}
              </List>
            </Paper>
          )}

          {/* Wilderness areas: single top-level panel with per-area subgroups */}
          {sortedWildernessAreas.length > 0 && (
            <Paper key="wilderness-areas" variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'info.main' }}>
              <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>Wilderness Areas</Typography>
                  </Box>
                </Box>
              </ListSubheader>
              <List dense disablePadding>
                {sortedWildernessAreas.map((areaName) => {
                  const packName = wildernessAreaPacks?.[areaName] ?? null
                  const header = (
                    <ListSubheader sx={{ lineHeight: '30px', bgcolor: 'inherit', opacity: 0.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{areaName}</Typography>
                      </Box>
                    </ListSubheader>
                  )

                  return (
                    <Box key={`wild-sub-${areaName}`}>
                      {packName ? (
                        <Tooltip title={packName} arrow placement="top">
                          {header}
                        </Tooltip>
                      ) : (
                        header
                      )}
                      {(wildernessAreaGroups[areaName] || []).map((g) => renderPlayerRow(g, false))}
                    </Box>
                  )
                })}
              </List>
            </Paper>
          )}

          {/* Not in quest (online but not public/wilderness/quest) */}
          {notInQuestGroups.length > 0 && (
            <Paper
              key="not-in-quest"
              variant="outlined"
              sx={{ mb: 2, overflow: 'hidden', borderColor: 'success.main' }}
            >
              <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="subtitle2">Not in quest</Typography>
                </Box>
              </ListSubheader>
              <List dense disablePadding>{renderNotInQuestGroups(notInQuestGroups)}</List>
            </Paper>
          )}

          {/* Quests */}
          {sortedQuestNames.map((questName) => (
            <Paper
              key={questName}
              variant="outlined"
              sx={{ mb: 2, overflow: 'hidden', borderColor: 'info.main' }}
            >
              <ListSubheader sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider', py: 1 }}>
                {(() => {
                  const packName = questNameToPack[questName]
                  const levelInfo = questLevels[questName]
                  const showPackLine = !!packName || !!levelInfo

                  return (
                    <Box sx={{ display: 'flex', alignItems: showPackLine ? 'flex-start' : 'center', gap: 1 }}>
                      <LocalOfferOutlinedIcon sx={{ fontSize: 18, mt: showPackLine ? '2px' : 0 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>{questName.replace(/ \((Heroic|Epic)\)$/, '')}</Typography>
                        {levelInfo && (
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>{levelInfo}</Typography>
                        )}
                        {packName && (
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>{packName}</Typography>
                        )}
                      </Box>
                    </Box>
                  )
                })()}
              </ListSubheader>
              <List dense disablePadding>
                {(questGroups[questName] || []).map((g) => renderPlayerRow(g))}
              </List>
            </Paper>
          ))}

          {/* Offline */}
          {offlineGroups.length > 0 && (
            <Paper key="offline" variant="outlined" sx={{ mb: 2, overflow: 'hidden', borderColor: 'text.disabled' }}>
              {(sortedPublicAreas.length > 0 || sortedWildernessAreas.length > 0 || sortedQuestNames.length > 0 || notInQuestGroups.length > 0) && (
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

      <LfmParticipantsDialog
        selectedLfm={selectedLfm}
        onClose={() => setSelectedLfm(null)}
        showClassIcons={showClassIcons}
      />
    </>
  )
}
