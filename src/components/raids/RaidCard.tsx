import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ListAltIcon from '@mui/icons-material/ListAlt'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
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
import { getPlayerDisplayName, groupEntriesByPlayer, isEntryAvailable, RaidEntry, RaidGroup } from '../../domains/raids/raidLogic'
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
  hasFriendInside?: boolean
  hasLfm?: boolean
  onLfmClick?: (questId: string) => void
}

export default function RaidCard({ raidGroup: g, now, isRaidCollapsed, onToggleRaid, isPlayerCollapsed, onTogglePlayer, showClassIcons, hasFriendInside, hasLfm, onLfmClick }: RaidCardProps) {
  const perPlayer = useMemo(() => groupEntriesByPlayer(g.entries, now), [g.entries, now])
  const [ignoredVersion, setIgnoredVersion] = useState(0)

  useEffect(() => {
    const handler = () => setIgnoredVersion((v) => v + 1)
    window.addEventListener('ddoaudit:ignoredTimersChanged', handler)
    return () => window.removeEventListener('ddoaudit:ignoredTimersChanged', handler)
  }, [])
  const raidNotes = getRaidNotesForRaidName(g.raidName)

  const friendsInRaid = useMemo(() => {
    const present = new Set<string>((g.entries ?? []).filter((e: any) => e?.isInRaid).map((e: any) => String(e?.playerName ?? '')))
    return EXPECTED_PLAYERS.filter((p) => present.has(p)).map((p) => getPlayerDisplayName(p))
  }, [g.entries])

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

  const allEligibleEntries = useMemo(() => perPlayerEligible.flatMap((pg) => pg.entries ?? []), [perPlayerEligible])
  const allAvailable = useMemo(
    () => allEligibleEntries.length > 0 && allEligibleEntries.every((e) => isEntryAvailable(e, now)),
    [allEligibleEntries, now]
  )
  const shouldShowTable = allEligibleEntries.length > 0 && (!allAvailable || hasPlayersInRaid || hasLfm)

  const highlight = Boolean(hasFriendInside || hasLfm)

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        ...(hasPlayersInRaid ? { borderColor: 'success.main' } : { borderColor: 'transparent' }),
        ...(highlight && {
          boxShadow: (theme: any) =>
            `inset 0 2px 0 0 ${theme.palette.primary.main}, inset 2px 0 0 0 ${theme.palette.primary.main}, inset -2px 0 0 0 ${theme.palette.primary.main}`,
        }),
      }}
    >
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
              {hasLfm && onLfmClick ? (
                <ListAltIcon
                  color="action"
                  sx={{ width: 18, height: 18, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onLfmClick(g.questId)
                  }}
                />
              ) : null}
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
          isRaidCollapsed && friendsInRaid.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {friendsInRaid.map((f) => (
                <Chip key={f} size="small" label={f} />
              ))}
            </Box>
          ) : availablePlayers > 0 && availablePlayers < EXPECTED_PLAYERS.length ? (
            <Typography variant="body2" color="text.secondary">
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

          {shouldShowTable ? (
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
