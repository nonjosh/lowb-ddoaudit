import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { Fragment, useEffect, useMemo, useState } from 'react'

import { addMs, fetchAreasById, formatTimeRemaining, RAID_LOCKOUT_MS } from '@/api/ddoAudit'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { RaidGroup } from '@/domains/raids/raidLogic'
import { buildTrainAvailability, TrainPlayerGroup } from '@/domains/raids/raidTrainLogic'

interface RaidTrainAvailabilityProps {
  selectedRaids: RaidGroup[]
  now: Date
}

/**
 * Shared component that displays a player × raid availability matrix
 * for a raid train. Characters available for ALL raids are highlighted.
 * Players are collapsible; online players are expanded by default.
 */
export default function RaidTrainAvailability({ selectedRaids, now }: RaidTrainAvailabilityProps) {
  const trainGroups: TrainPlayerGroup[] = useMemo(
    () => buildTrainAvailability(selectedRaids, now),
    [selectedRaids, now],
  )

  const [areas, setAreas] = useState<Record<string, { name: string }>>({})

  useEffect(() => {
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  // Default: expand online players, collapse offline
  const [collapsedPlayers, setCollapsedPlayers] = useState<Set<string>>(() => {
    const collapsed = new Set<string>()
    for (const pg of trainGroups) {
      if (!pg.isPlayerOnline) collapsed.add(pg.player)
    }
    return collapsed
  })

  // Update collapsed state when trainGroups identity changes (e.g. new raids selected)
  const [prevGroupKey, setPrevGroupKey] = useState(() =>
    trainGroups.map((g) => g.player).join(','),
  )
  const groupKey = trainGroups.map((g) => g.player).join(',')
  if (groupKey !== prevGroupKey) {
    setPrevGroupKey(groupKey)
    const collapsed = new Set<string>()
    for (const pg of trainGroups) {
      if (!pg.isPlayerOnline) collapsed.add(pg.player)
    }
    setCollapsedPlayers(collapsed)
  }

  const togglePlayer = (player: string) => {
    setCollapsedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(player)) {
        next.delete(player)
      } else {
        next.add(player)
      }
      return next
    })
  }

  if (!selectedRaids.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Select at least 2 raids to check availability.
      </Typography>
    )
  }

  if (!trainGroups.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No character data available.
      </Typography>
    )
  }

  /** Shorten raid name for column header */
  const shortName = (name: string): string => {
    const cleaned = name
      .replace(/^Legendary\s+/i, 'L ')
      .replace(/^The\s+/i, '')
    return cleaned.length > 20 ? cleaned.slice(0, 18) + '…' : cleaned
  }

  const nowTime = now.getTime()

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 400 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Player / Character</TableCell>
            {selectedRaids.map((r) => (
              <TableCell
                key={r.questId}
                align="center"
                sx={{
                  fontWeight: 600,
                  minWidth: 40,
                  maxWidth: 100,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: 1.2,
                  fontSize: '0.75rem',
                  p: 0.5,
                }}
              >
                <Tooltip title={r.raidName}>
                  <span>{shortName(r.raidName)}</span>
                </Tooltip>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {trainGroups.map((pg, pgIdx) => {
            const isCollapsed = collapsedPlayers.has(pg.player)
            const availableForAllCount = pg.characters.filter((c) => c.availableForAll).length

            return (
              <Fragment key={pg.player}>
                {/* Player summary row */}
                <TableRow
                  onClick={() => togglePlayer(pg.player)}
                  sx={{
                    cursor: 'pointer',
                    '& td': {
                      borderBottom: isCollapsed ? undefined : 'none',
                      borderTop: pgIdx > 0 ? '2px solid' : undefined,
                      borderTopColor: pgIdx > 0 ? 'divider' : undefined,
                    },
                    backgroundColor: pg.hasFullTrainChar ? 'action.selected' : undefined,
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        <ExpandMoreIcon
                          sx={{
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            width: 18,
                            height: 18,
                          }}
                        />
                      </IconButton>
                      <FiberManualRecordIcon
                        sx={{
                          width: 8,
                          height: 8,
                          color: pg.isPlayerOnline ? 'success.main' : 'text.disabled',
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {pg.player}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        ({availableForAllCount}/{pg.characters.length})
                      </Typography>
                    </Box>
                  </TableCell>
                  {/* Summary: show best character's availability per raid */}
                  {selectedRaids.map((r) => {
                    const anyAvailable = pg.characters.some((c) => c.perRaid[r.questId] === true)
                    return (
                      <TableCell key={r.questId} align="center">
                        {anyAvailable ? (
                          <CheckCircleIcon color="success" sx={{ width: 18, height: 18 }} />
                        ) : (
                          <CancelIcon color="error" sx={{ width: 18, height: 18, opacity: 0.5 }} />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>

                {/* Expanded character rows - flat in same table for alignment */}
                {!isCollapsed && pg.characters.map((c) => {
                  const raidEntryMap = new Map<string, { lastTimestamp: string | null }>()
                  for (const raid of selectedRaids) {
                    const entry = raid.entries.find((e) => e.characterId === c.characterId)
                    if (entry) raidEntryMap.set(raid.questId, entry)
                  }

                  const areaName = c.locationId && areas[c.locationId]?.name
                    ? areas[c.locationId].name
                    : null

                  return (
                    <TableRow
                      key={c.characterId}
                      sx={{
                        backgroundColor: c.availableForAll ? 'action.selected' : undefined,
                      }}
                    >
                      <TableCell sx={{ pl: 5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {c.isOnline && (
                            <FiberManualRecordIcon
                              sx={{ width: 6, height: 6, color: 'success.main', flexShrink: 0 }}
                            />
                          )}
                          <Typography variant="body2" noWrap>{c.characterName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.totalLevel}
                          </Typography>
                          <ClassDisplay classes={c.classes} showIcons iconSize={18} />
                          {areaName && (
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ ml: 0.5, opacity: 0.7 }}>
                              — {areaName}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      {selectedRaids.map((r) => {
                        const available = c.perRaid[r.questId] === true
                        const entry = raidEntryMap.get(r.questId)
                        const readyAt = entry?.lastTimestamp ? addMs(entry.lastTimestamp, RAID_LOCKOUT_MS) : null
                        const remaining = readyAt ? readyAt.getTime() - nowTime : 0

                        return (
                          <TableCell key={r.questId} align="center">
                            {available ? (
                              <CheckCircleIcon color="success" sx={{ width: 18, height: 18 }} />
                            ) : (
                              <Tooltip title={remaining > 0 ? formatTimeRemaining(remaining) : ''}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <CancelIcon color="error" sx={{ width: 18, height: 18, opacity: 0.7 }} />
                                </Box>
                              </Tooltip>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
