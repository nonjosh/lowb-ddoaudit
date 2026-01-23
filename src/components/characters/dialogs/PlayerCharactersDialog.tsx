import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material'
import React, { useState } from 'react'

import { formatAge, formatLocalDateTime } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { Character, useCharacter } from '@/contexts/useCharacter'
import { useConfig } from '@/contexts/useConfig'

import CharacterRaidTimersTable from './CharacterRaidTimersTable'
import RansackTimerView from './RansackTimerView'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface PlayerCharactersDialogProps {
  open: boolean
  onClose: () => void
  playerName: string
  characters: Character[]
}

export default function PlayerCharactersDialog({ open, onClose, playerName, characters }: PlayerCharactersDialogProps) {
  const { showClassIcons } = useConfig()
  const { raidActivity, questsById } = useCharacter()
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set())
  const [showAllRaidTimers, setShowAllRaidTimers] = useState(false)
  const [closedCharacters, setClosedCharacters] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'raid_timers' | 'loot_ransack'>('raid_timers')

  const hasRaidTimers = (character: Character): boolean => {
    if (!character?.id) return false

    const questTimers = new Map<string, { questId: string; raidName: string; questLevel: number | null; lastTimestamp: string }>()

    for (const item of raidActivity ?? []) {
      const characterId = String(item?.character_id ?? '')
      if (characterId !== character.id) continue

      const ts = item?.timestamp
      const questIds = item.data.quest_ids

      if (!ts || !Array.isArray(questIds)) continue

      for (const questIdRaw of questIds) {
        const questId = String(questIdRaw)
        if (!questId) continue

        const quest = questsById?.[questId]
        const raidName = quest?.name ?? `Unknown quest (${questId})`
        const questLevel = quest?.level ?? null

        if (typeof questLevel === 'number' && questLevel < 20) continue

        const existing = questTimers.get(questId)
        if (!existing || new Date(ts).getTime() > new Date(existing.lastTimestamp).getTime()) {
          questTimers.set(questId, {
            questId,
            raidName,
            questLevel,
            lastTimestamp: ts,
          })
        }
      }
    }

    return questTimers.size > 0
  }

  const toggleExpanded = (characterId: string) => {
    if (showAllRaidTimers) {
      const newSet = new Set(closedCharacters)
      if (newSet.has(characterId)) {
        newSet.delete(characterId)
      } else {
        newSet.add(characterId)
      }
      setClosedCharacters(newSet)
    } else {
      const newSet = new Set(expandedCharacters)
      if (newSet.has(characterId)) {
        newSet.delete(characterId)
      } else {
        newSet.add(characterId)
      }
      setExpandedCharacters(newSet)
    }
  }
  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newValue: 'raid_timers' | 'loot_ransack' | null) => {
    if (newValue) {
      setViewMode(newValue)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {playerName ?? ''}
            <Chip label={characters.length} size="small" variant="outlined" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="raid_timers">Raid Timers</ToggleButton>
              <ToggleButton value="loot_ransack">Loot Ransack</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {viewMode === 'loot_ransack' ? (
          <RansackTimerView playerName={playerName} characters={characters} />
        ) : (
          Array.isArray(characters) && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowAllRaidTimers(!showAllRaidTimers)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  {showAllRaidTimers ? 'Hide' : 'Show'} All Timers
                </Button>
              </Box>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Level</TableCell>
                      <TableCell>Classes</TableCell>
                      <TableCell>Race</TableCell>
                      <TableCell>Last online</TableCell>
                      <TableCell width="40"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {characters
                      .slice()
                      .sort((a, b) => {
                        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1
                        const dateA = a.last_update ? new Date(a.last_update).getTime() : 0
                        const dateB = b.last_update ? new Date(b.last_update).getTime() : 0
                        return dateB - dateA
                      })
                      .map((c) => (
                        <React.Fragment key={c.id}>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FiberManualRecordIcon color={c.is_online ? 'success' : 'disabled'} sx={{ width: 10, height: 10 }} />
                                {c.name}
                              </Box>
                            </TableCell>
                            <TableCell>{c.total_level}</TableCell>
                            <TableCell>
                              <ClassDisplay classes={c.classes} showIcons={showClassIcons} />
                            </TableCell>
                            <TableCell>{c.race}</TableCell>
                            <TableCell>
                              {(() => {
                                if (c.is_online) return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FiberManualRecordIcon color="success" sx={{ width: 10, height: 10 }} />
                                    Online
                                  </Box>
                                )
                                if (!c.last_update) return '—'

                                const updatedAt = new Date(c.last_update)
                                if (Number.isNaN(updatedAt.getTime())) return '—'

                                const ageMs = Date.now() - updatedAt.getTime()
                                const exact = formatLocalDateTime(c.last_update)

                                if (ageMs >= 0 && ageMs <= WEEK_MS) {
                                  const relative = formatAge(c.last_update)
                                  const relativeWithAgo = relative === '—' ? exact : `${relative} ago`
                                  return (
                                    <Tooltip title={exact} arrow>
                                      <Box component="span" sx={{ cursor: 'help' }}>
                                        {relativeWithAgo}
                                      </Box>
                                    </Tooltip>
                                  )
                                }

                                return exact
                              })()}
                            </TableCell>
                            <TableCell>
                              {hasRaidTimers(c) && (
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpanded(c.id)}
                                  sx={{
                                    transform: (showAllRaidTimers ? !closedCharacters.has(c.id) : expandedCharacters.has(c.id)) ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                  }}
                                >
                                  <ExpandMoreIcon fontSize="small" />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                              <Collapse in={showAllRaidTimers ? !closedCharacters.has(c.id) : expandedCharacters.has(c.id)} timeout="auto" unmountOnExit>
                                <CharacterRaidTimersTable character={c} />
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>            </Box>)
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
