import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RestoreIcon from '@mui/icons-material/Restore'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { type MouseEvent, useEffect, useState } from 'react'

import { addIgnoredTimer, addMs, formatLocalDateTime, formatTimeRemaining, isTimerIgnored, RAID_LOCKOUT_MS, removeIgnoredTimer } from '@/api/ddoAudit'

interface TimeRemainingDisplayProps {
  characterId: string
  lastTimestamp: string | null
  available: boolean
  showIgnoreButton?: boolean
}

export default function TimeRemainingDisplay({ characterId, lastTimestamp, available, showIgnoreButton = true }: TimeRemainingDisplayProps) {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1)
    window.addEventListener('ddoaudit:ignoredTimersChanged', handler)
    return () => window.removeEventListener('ddoaudit:ignoredTimersChanged', handler)
  }, [])

  // Check if this timer is ignored by the user
  const isIgnored = (() => {
    try {
      return isTimerIgnored(characterId, lastTimestamp)
    } catch {
      return false
    }
  })()

  // If timer is ignored, treat as available
  const effectivelyAvailable = available || isIgnored

  const now = new Date()
  const nowTime = now.getTime()
  const readyAt = addMs(lastTimestamp, RAID_LOCKOUT_MS)
  const remaining = readyAt ? readyAt.getTime() - nowTime : NaN

  const lastCompletionText = formatLocalDateTime(lastTimestamp)
  const tooltipTitle = effectivelyAvailable ? null : (
    <Box>
      <Typography variant="body2">Last completion: {lastCompletionText}</Typography>
    </Box>
  )

  const handleToggleIgnore = (e: MouseEvent) => {
    e.stopPropagation()
    try {
      if (isIgnored) {
        removeIgnoredTimer(characterId, lastTimestamp)
      } else {
        addIgnoredTimer(characterId, lastTimestamp)
      }
    } catch {
      // ignore errors
    }
  }

  return (
    <Tooltip title={tooltipTitle}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {effectivelyAvailable ? 'Available' : formatTimeRemaining(remaining)}
          {effectivelyAvailable && <CheckCircleIcon color="success" sx={{ width: 14, height: 14 }} />}
        </Typography>
        {!effectivelyAvailable && readyAt ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {formatLocalDateTime(readyAt)}
          </Typography>
        ) : null}

        {/* Ignore/restore timer button (client-only) */}
        {showIgnoreButton && lastTimestamp ? (
          <Tooltip title={isIgnored ? 'Restore this timer (undo ignore)' : 'Ignore this timer (show character as available)'}>
            <IconButton size="small" sx={{ ml: 'auto' }} onClick={handleToggleIgnore}>
              {isIgnored ? <RestoreIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
    </Tooltip>
  )
}