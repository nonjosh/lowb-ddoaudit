import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

import { fetchAreasById } from '@/api/ddoAudit'
import { EXPECTED_PLAYERS } from '@/config/characters'
import RaidTimerTable from '../raids/RaidTimerTable'
import ClassDisplay from '../shared/ClassDisplay'

interface LfmParticipant {
  characterName: string
  playerName: string
  playerDisplayName: string
  guildName: string
  totalLevel: number | null
  classesDisplay: string
  classes?: any[]
  isLeader: boolean
  race?: string
  location_id: number
}

interface LfmGroup {
  questName: string
  adventurePack?: string | null
  areaId: string
  questLevel: number | null
  adventureActiveMinutes?: number | null
  difficultyDisplay: string
  difficultyColor: string
  participants: LfmParticipant[]
  maxPlayers?: number
  isRaid: boolean
  questId: string
}

interface LfmParticipantsDialogProps {
  selectedLfm: LfmGroup | null
  onClose: () => void
  showClassIcons: boolean
  selectedRaidData: { raidGroup: any; perPlayerEligible: any[] } | null
}

export default function LfmParticipantsDialog({ selectedLfm, onClose, showClassIcons, selectedRaidData }: LfmParticipantsDialogProps) {
  const [areas, setAreas] = useState<Record<string, { name: string }>>({})
  const [collapsedPlayers, setCollapsedPlayers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedRaidData?.perPlayerEligible) {
      const next = new Set<string>()
      for (const pg of selectedRaidData.perPlayerEligible) {
        next.add(pg.player)
      }
      setCollapsedPlayers(next)
    }
  }, [selectedRaidData])

  const isPlayerCollapsed = (_questId: string, playerName: string) => collapsedPlayers.has(playerName)

  const onTogglePlayer = (_questId: string, playerName: string) => {
    setCollapsedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(playerName)) {
        next.delete(playerName)
      } else {
        next.add(playerName)
      }
      return next
    })
  }

  useEffect(() => {
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  return (
    <Dialog open={Boolean(selectedLfm)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
            <Typography variant="h6" component="div">
              {selectedLfm?.questName || 'LFM Group'}
              {selectedLfm && (
                <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                  ({selectedLfm.participants.length}/{selectedLfm.maxPlayers ?? 6})
                </Typography>
              )}
            </Typography>
            {selectedLfm?.adventurePack && (
              <Typography variant="caption" color="text.secondary">
                {selectedLfm.adventurePack}
              </Typography>
            )}
          </Stack>
          {selectedLfm?.areaId && areas && areas[selectedLfm.areaId]?.name && (
            <Typography variant="body2" color="text.secondary">
              {areas && areas[selectedLfm.areaId]?.name}
            </Typography>
          )}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {typeof selectedLfm?.questLevel === 'number'
                  ? `Quest Lv ${selectedLfm.questLevel}`
                  : 'Quest Lv —'}
              </Typography>
              {selectedLfm?.difficultyDisplay && (
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: selectedLfm.difficultyColor || 'text.primary' }}
                >
                  {selectedLfm.difficultyDisplay}
                </Typography>
              )}
            </Stack>
            {typeof selectedLfm?.adventureActiveMinutes === 'number' ? (
              <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 600 }}>
                Active {selectedLfm.adventureActiveMinutes} min
              </Typography>
            ) : null}
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Table size="small" aria-label="lfm members">
          <TableHead>
            <TableRow>
              <TableCell>Character</TableCell>
              <TableCell align="right" sx={{ width: 80 }}>
                Level
              </TableCell>
              <TableCell>Classes</TableCell>
              <TableCell>Race</TableCell>
              <TableCell>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(selectedLfm?.participants ?? []).map((p) => (
              <TableRow key={`${p.characterName}:${p.playerName}`}>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" noWrap>
                        {p.characterName}
                      </Typography>
                      {EXPECTED_PLAYERS.includes(p.playerName) ? (
                        <Chip size="small" color="success" label={p.playerDisplayName} />
                      ) : null}
                      {p.isLeader ? <Chip size="small" variant="outlined" label="Leader" /> : null}
                    </Stack>
                    {p.guildName ? (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {p.guildName}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell align="right">{typeof p.totalLevel === 'number' ? p.totalLevel : '—'}</TableCell>
                <TableCell>
                  <ClassDisplay classes={p.classes ?? []} showIcons={showClassIcons} />
                </TableCell>
                <TableCell>{p.race}</TableCell>
                <TableCell>{areas[String(p.location_id)]?.name || 'Unknown'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {selectedLfm?.isRaid && selectedRaidData ? (
          <>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Raid Timers
            </Typography>
            <RaidTimerTable
              perPlayerEligible={selectedRaidData.perPlayerEligible}
              isPlayerCollapsed={isPlayerCollapsed}
              onTogglePlayer={onTogglePlayer}
              showClassIcons={showClassIcons}
              questId={selectedLfm.questId}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
