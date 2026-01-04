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
  Tooltip,
} from '@mui/material'
import React, { useState } from 'react'

import { formatAge, formatLocalDateTime } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { useConfig } from '@/contexts/ConfigContext'

import CharacterRaidTimersTable from './CharacterRaidTimersTable'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface PlayerCharactersDialogProps {
  open: boolean
  onClose: () => void
  playerName: string
  characters: any[]
}

export default function PlayerCharactersDialog({ open, onClose, playerName, characters }: PlayerCharactersDialogProps) {
  const { showClassIcons } = useConfig()
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set())
  const [showAllRaidTimers, setShowAllRaidTimers] = useState(false)

  const toggleExpanded = (characterId: string) => {
    const newSet = new Set(expandedCharacters)
    if (newSet.has(characterId)) {
      newSet.delete(characterId)
    } else {
      newSet.add(characterId)
    }
    setExpandedCharacters(newSet)
  }
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {playerName ?? ''}
            <Chip label={characters.length} size="small" variant="outlined" />
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowAllRaidTimers(!showAllRaidTimers)}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            {showAllRaidTimers ? 'Hide' : 'Show'} All Timers
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        {Array.isArray(characters) && (
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
                    return new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
                  })
                  .map((c) => (
                    <React.Fragment key={c.id}>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {c.name}
                            {c.is_online && <FiberManualRecordIcon color="success" sx={{ width: 10, height: 10 }} />}
                          </Box>
                        </TableCell>
                        <TableCell>{c.total_level}</TableCell>
                        <TableCell>
                          <ClassDisplay classes={c.classes} showIcons={showClassIcons} />
                        </TableCell>
                        <TableCell>{c.race}</TableCell>
                        <TableCell>
                          {(() => {
                            if (c.is_online) return 'Online'

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
                          <IconButton
                            size="small"
                            onClick={() => toggleExpanded(c.id)}
                            sx={{
                              transform: expandedCharacters.has(c.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s'
                            }}
                          >
                            <ExpandMoreIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={expandedCharacters.has(c.id) || showAllRaidTimers} timeout="auto" unmountOnExit>
                            <CharacterRaidTimersTable character={c} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
