import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { Box, Collapse, IconButton, Table, TableBody, TableCell, TableRow, Tooltip, Typography } from '@mui/material'
import { memo } from 'react'

import {
  addMs,
  formatLocalDateTime,
  formatTimeRemaining,
  RAID_LOCKOUT_MS,
} from '../../api/ddoAuditApi'
import { useCharacter } from '../../contexts/CharacterContext'
import { formatClasses, getPlayerDisplayName, isEntryAvailable, PlayerGroup } from '../../domains/raids/raidLogic'
import CharacterNamesWithClassTooltip from '../shared/CharacterNamesWithClassTooltip'
import ClassDisplay from '../shared/ClassDisplay'

interface RaidPlayerGroupProps {
  playerGroup: PlayerGroup
  now: Date
  collapsed: boolean
  onToggleCollapsed: (playerName: string) => void
  showClassIcons: boolean
}

function RaidPlayerGroup({ playerGroup, now, collapsed, onToggleCollapsed, showClassIcons }: RaidPlayerGroupProps) {
  const { isPlayerOnline: checkPlayerOnline } = useCharacter()
  const pg = playerGroup
  const entries = pg.entries ?? []
  const nowTime = now.getTime()

  const isPlayerOnline = checkPlayerOnline(pg.player)
  const isPlayerInRaid = entries.some((e) => e.isInRaid)

  // Hide characters below level 30.
  const eligibleEntries = entries.filter((e) => {
    const lvl = e?.totalLevel
    return typeof lvl !== 'number' || lvl >= 30
  })

  const displayEntries = eligibleEntries
    .slice()
    .sort((a, b) => {
      const aAvailable = isEntryAvailable(a, now)
      const bAvailable = isEntryAvailable(b, now)
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1

      // For available characters, sort by level desc.
      if (aAvailable && bAvailable) {
        const aLvl = typeof a?.totalLevel === 'number' ? a.totalLevel : Number.NEGATIVE_INFINITY
        const bLvl = typeof b?.totalLevel === 'number' ? b.totalLevel : Number.NEGATIVE_INFINITY
        if (aLvl !== bLvl) return bLvl - aLvl
        return String(a?.characterName ?? '').localeCompare(String(b?.characterName ?? ''))
      }

      // For unavailable characters, keep a useful order: soonest-to-ready first.
      const aReadyAt = addMs(a?.lastTimestamp, RAID_LOCKOUT_MS)
      const bReadyAt = addMs(b?.lastTimestamp, RAID_LOCKOUT_MS)
      const aRemaining = aReadyAt ? aReadyAt.getTime() - nowTime : Number.POSITIVE_INFINITY
      const bRemaining = bReadyAt ? bReadyAt.getTime() - nowTime : Number.POSITIVE_INFINITY
      if (aRemaining !== bRemaining) return aRemaining - bRemaining
      return String(a?.characterName ?? '').localeCompare(String(b?.characterName ?? ''))
    })
  const availableCount = eligibleEntries.filter((e) => isEntryAvailable(e, now)).length
  const totalCount = eligibleEntries.length

  const collapsedAvailabilityNode = (() => {
    if (!collapsed) return null

    const available = eligibleEntries
      .filter((e) => isEntryAvailable(e, now))
      .slice()
      .sort((a, b) => String(a?.characterName ?? '').localeCompare(String(b?.characterName ?? '')))

    if (available.length) {
      const inRaid = available.filter((e) => e.isInRaid)
      const notInRaid = available.filter((e) => !e.isInRaid)

      return (
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          {inRaid.length > 0 && (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DirectionsRunIcon color="warning" sx={{ width: 16, height: 16 }} />
              <CharacterNamesWithClassTooltip
                items={inRaid.map((e) => ({
                  id: e?.characterId,
                  name: e?.characterName,
                  classes: e?.classes,
                }))}
                showClassIcons={showClassIcons}
              />
            </Box>
          )}
          {notInRaid.length > 0 && (
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CheckCircleIcon color="success" sx={{ width: 16, height: 16 }} />
              <CharacterNamesWithClassTooltip
                items={notInRaid.map((e) => ({
                  id: e?.characterId,
                  name: e?.characterName,
                  classes: e?.classes,
                }))}
                showClassIcons={showClassIcons}
              />
            </Box>
          )}
        </Box>
      )
    }

    // None available: show a ❌ plus the soonest-to-be-available character.
    let soonest = null
    let soonestRemaining = Number.POSITIVE_INFINITY
    let soonestReadyAt = null
    for (const e of eligibleEntries) {
      const readyAt = addMs(e?.lastTimestamp, RAID_LOCKOUT_MS)
      if (!readyAt) continue
      const remaining = readyAt.getTime() - nowTime
      if (remaining > 0 && remaining < soonestRemaining) {
        soonest = e
        soonestRemaining = remaining
        soonestReadyAt = readyAt
      }
    }

    if (soonest) {
      const when = soonestReadyAt ? formatLocalDateTime(soonestReadyAt) : '—'
      return (
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CancelIcon color="error" sx={{ width: 16, height: 16 }} />
          <Typography variant="caption" color="text.secondary">
            Soonest: {soonest.characterName} ({formatTimeRemaining(soonestRemaining)} · {when})
          </Typography>
        </Box>
      )
    }

    return <CancelIcon color="error" sx={{ width: 16, height: 16 }} />
  })()

  return (
    <>
      <TableRow
        onClick={() => onToggleCollapsed(pg.player)}
        sx={{ '& > *': { borderBottom: 'unset' }, bgcolor: 'action.hover', cursor: 'pointer' }}
      >
        <TableCell colSpan={5} sx={{ py: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onToggleCollapsed(pg.player)
              }}
              sx={{ transform: !collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isPlayerInRaid ? (
                <Tooltip title="In Raid">
                  <DirectionsRunIcon color="warning" sx={{ width: 16, height: 16 }} />
                </Tooltip>
              ) : isPlayerOnline ? (
                <Tooltip title="Online">
                  <FiberManualRecordIcon color="success" sx={{ width: 12, height: 12 }} />
                </Tooltip>
              ) : (
                <Tooltip title="Offline">
                  <FiberManualRecordIcon color="disabled" sx={{ width: 12, height: 12 }} />
                </Tooltip>
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{getPlayerDisplayName(pg.player)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">({availableCount}/{totalCount})</Typography>
            {collapsed ? collapsedAvailabilityNode : null}
          </Box>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
          <Collapse in={!collapsed} timeout="auto" unmountOnExit>
            <Table size="small" aria-label="characters">
              <TableBody>
                {displayEntries.map((e) => {
                  const available = isEntryAvailable(e, now)
                  const lastCompletionText = formatLocalDateTime(e.lastTimestamp)
                  const readyAt = addMs(e.lastTimestamp, RAID_LOCKOUT_MS)
                  const remaining = readyAt ? readyAt.getTime() - nowTime : NaN

                  const tooltipTitle = available ? null : (
                    <Box>
                      <Typography variant="body2">Last completion: {lastCompletionText}</Typography>
                    </Box>
                  )

                  return (
                    <TableRow key={e.characterId} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {e.isInRaid ? (
                            <Tooltip title="In Raid">
                              <DirectionsRunIcon color="warning" sx={{ width: 16, height: 16 }} />
                            </Tooltip>
                          ) : e.isOnline ? (
                            <Tooltip title="Online">
                              <FiberManualRecordIcon color="success" sx={{ width: 10, height: 10 }} />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Offline">
                              <FiberManualRecordIcon color="disabled" sx={{ width: 10, height: 10 }} />
                            </Tooltip>
                          )}
                          <Tooltip title={formatClasses(e?.classes)}>
                            <Typography variant="body2">{e.characterName}</Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{e.totalLevel ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {showClassIcons ? (
                          <ClassDisplay classes={e.classes} showIcons={true} />
                        ) : (
                          <Typography variant="body2">{formatClasses(e.classes)}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{e.race}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={tooltipTitle}>
                          <Box>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {formatTimeRemaining(remaining)}
                              {!Number.isFinite(remaining) && <CheckCircleIcon color="success" sx={{ width: 14, height: 14 }} />}
                            </Typography>
                            {!available && readyAt ? (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatLocalDateTime(readyAt)}
                              </Typography>
                            ) : null}
                          </Box>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default memo(RaidPlayerGroup)
