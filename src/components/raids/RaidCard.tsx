import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { EXPECTED_PLAYERS } from '../../config/characters'
import { groupEntriesByPlayer, isEntryAvailable, RaidEntry, RaidGroup } from '../../domains/raids/raidLogic'
import { getRaidNotesForRaidName } from '../../domains/raids/raidNotes'
import RaidPlayerGroup from './RaidPlayerGroup'

interface RaidCardProps {
  raidGroup: RaidGroup
  now: Date
  isRaidCollapsed: boolean
  onToggleRaid: () => void
  isPlayerCollapsed: (questId: string, playerName: string) => boolean
  onTogglePlayer: (questId: string, playerName: string) => void
  showClassIcons: boolean
}

export default function RaidCard({ raidGroup, now, isRaidCollapsed, onToggleRaid, isPlayerCollapsed, onTogglePlayer, showClassIcons }: RaidCardProps) {
  const g = raidGroup
  const perPlayer = useMemo(() => groupEntriesByPlayer(g.entries, now), [g.entries, now])
  const [ignoredVersion, setIgnoredVersion] = useState(0)

  useEffect(() => {
    const handler = () => setIgnoredVersion((v) => v + 1)
    window.addEventListener('ddoaudit:ignoredTimersChanged', handler)
    return () => window.removeEventListener('ddoaudit:ignoredTimersChanged', handler)
  }, [])
  const raidNotes = getRaidNotesForRaidName(g.raidName)

  const handleTogglePlayer = useCallback((playerName: string) => {
    onTogglePlayer(g.questId, playerName)
  }, [onTogglePlayer, g.questId])

  const renderNotesField = (label: string, items: string[] | undefined) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : []
    if (list.length === 0) return null
    return (
      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>{label}:</Typography>
        <Box>
          {list.map((x, idx) => (
            <Typography key={idx} variant="body2" component="div">{x}</Typography>
          ))}
        </Box>
      </Box>
    )
  }

  const perPlayerEligible = useMemo(() => {
    const isEligibleEntry = (e: RaidEntry) => {
      const lvl = e?.totalLevel
      return typeof lvl !== 'number' || lvl >= 30
    }

    return perPlayer
      .map((pg) => ({ ...pg, entries: (pg.entries ?? []).filter(isEligibleEntry) }))
      .filter((pg) => (pg.entries ?? []).length > 0)
  }, [perPlayer, ignoredVersion])

  const availablePlayers = useMemo(() => EXPECTED_PLAYERS.filter((playerName) => {
    const pg = perPlayerEligible.find((p) => p.player === playerName)
    return pg ? (pg.entries ?? []).some((e) => isEntryAvailable(e, now)) : false
  }).length, [perPlayerEligible, now])

  const hasPlayersInRaid = useMemo(() => {
    return g.entries.some((e) => e.isInRaid)
  }, [g.entries])

  return (
    <Card sx={{ mb: 2, border: hasPlayersInRaid ? '2px solid' : 'none', borderColor: 'success.main' }}>
      <CardHeader
        onClick={onToggleRaid}
        sx={{ cursor: 'pointer' }}
        action={
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              onToggleRaid()
            }}
            aria-label="show more"
            sx={{ transform: !isRaidCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
          >
            <ExpandMoreIcon />
          </IconButton>
        }
        title={
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6">{g.raidName}</Typography>
              <Typography variant="caption" color="text.secondary">
                Level: {typeof g.questLevel === 'number' ? g.questLevel : '—'}
              </Typography>
            </Box>
            {g.adventurePack && (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {g.adventurePack}
              </Typography>
            )}
          </Box>
        }
        subheader={
          availablePlayers > 0 ? (
            <Typography variant="body2" color={availablePlayers === EXPECTED_PLAYERS.length ? 'success.main' : 'text.secondary'}>
              Available players: {availablePlayers}/{EXPECTED_PLAYERS.length}
            </Typography>
          ) : null
        }
      />

      <Collapse in={!isRaidCollapsed} timeout="auto" unmountOnExit>
        <CardContent>
          {raidNotes ? (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              {renderNotesField('Augment', raidNotes.augments)}
              {renderNotesField('Set', raidNotes.sets)}
              {renderNotesField('Notes', raidNotes.notes)}
            </Box>
          ) : null}

          {availablePlayers > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Character</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Classes</TableCell>
                    <TableCell>Race</TableCell>
                    <TableCell>Time remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {perPlayerEligible.map((pg) => {
                    const collapsed = isPlayerCollapsed(g.questId, pg.player)
                    return (
                      <RaidPlayerGroup
                        key={pg.player}
                        playerGroup={pg}
                        now={now}
                        collapsed={collapsed}
                        onToggleCollapsed={handleTogglePlayer}
                        showClassIcons={showClassIcons}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </CardContent>
      </Collapse>
    </Card>
  )
}
