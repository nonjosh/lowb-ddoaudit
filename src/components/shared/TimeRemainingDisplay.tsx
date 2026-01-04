import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RestoreIcon from '@mui/icons-material/Restore'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

import { addIgnoredTimer, addMs, formatLocalDateTime, formatTimeRemaining, isTimerIgnored, RAID_LOCKOUT_MS, removeIgnoredTimer } from '@/api/ddoAudit'

interface TimeRemainingDisplayProps {
  characterId: string
  lastTimestamp: string | null
  available: boolean
  showIgnoreButton?: boolean
}

function IgnoreButton({ characterId, lastTimestamp, sx }: { characterId: string; lastTimestamp: string | null; sx?: any }) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1)
    window.addEventListener('ddoaudit:ignoredTimersChanged', handler)
    return () => window.removeEventListener('ddoaudit:ignoredTimersChanged', handler)
  }, [])

  const ignored = (() => {
    try { return isTimerIgnored(characterId, lastTimestamp) } catch (err) { return false }
  })()

  if (ignored) {
    return (
      <Tooltip title="Restore this timer (undo ignore)">
        <IconButton
          size="small"
          sx={sx}
          onClick={(e) => {
            e.stopPropagation()
            try { removeIgnoredTimer(characterId, lastTimestamp) } catch (err) { /* ignore */ }
          }}
        >
          <RestoreIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )
  }

  return (
    <Tooltip title="Ignore this timer (show character as available)">
      <IconButton
        size="small"
        sx={sx}
        onClick={(e) => {
          e.stopPropagation()
          try { addIgnoredTimer(characterId, lastTimestamp) } catch (err) { /* ignore */ }
        }}
      >
        <CancelIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

export default function TimeRemainingDisplay({ characterId, lastTimestamp, available, showIgnoreButton = true }: TimeRemainingDisplayProps) {
  const now = new Date()
  const nowTime = now.getTime()
  const readyAt = addMs(lastTimestamp, RAID_LOCKOUT_MS)
  const remaining = readyAt ? readyAt.getTime() - nowTime : NaN

  const lastCompletionText = formatLocalDateTime(lastTimestamp)
  const tooltipTitle = available ? null : (
    <Box>
      <Typography variant="body2">Last completion: {lastCompletionText}</Typography>
    </Box>
  )

  return (
    <Tooltip title={tooltipTitle}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {formatTimeRemaining(remaining)}
          {!Number.isFinite(remaining) && <CheckCircleIcon color="success" sx={{ width: 14, height: 14 }} />}
        </Typography>
        {!available && readyAt ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {formatLocalDateTime(readyAt)}
          </Typography>
        ) : null}

        {/* Delete / ignore timer button (client-only) */}
        {showIgnoreButton && lastTimestamp ? (
          <IgnoreButton
            characterId={characterId}
            lastTimestamp={lastTimestamp}
            sx={{ ml: 'auto' }}
          />
        ) : null}
      </Box>
    </Tooltip>
  )
}