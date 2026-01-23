import DeleteIcon from '@mui/icons-material/Delete'
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
import { useMemo } from 'react'

import { formatLocalDateTime } from '@/api/ddoAudit'
import type { RansackTimer } from '@/storage/ransackDb'

interface RansackTimerTableProps {
  timers: RansackTimer[]
  onDelete: (id: number) => void
  groupBy: 'character' | 'quest'
  showCharacterColumn?: boolean
  showQuestColumn?: boolean
}

function formatTimeRemaining(expiresAt: string): string {
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - now

  if (diff <= 0) {
    return 'Expired'
  }

  const totalMinutes = Math.floor(diff / (1000 * 60))
  const totalHours = Math.floor(totalMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function getTimeRemainingColor(expiresAt: string): string {
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - now
  const hoursRemaining = diff / (1000 * 60 * 60)

  if (hoursRemaining <= 0) return 'error.main'
  if (hoursRemaining <= 24) return 'warning.main'
  return 'success.main'
}

interface GroupedTimers {
  key: string
  label: string
  timers: RansackTimer[]
}

export default function RansackTimerTable({
  timers,
  onDelete,
  groupBy,
  showCharacterColumn = true,
  showQuestColumn = true,
}: RansackTimerTableProps) {
  const groupedTimers = useMemo<GroupedTimers[]>(() => {
    const groups = new Map<string, RansackTimer[]>()

    for (const timer of timers) {
      const key = groupBy === 'character' ? timer.characterId : timer.questId
      const existing = groups.get(key) ?? []
      existing.push(timer)
      groups.set(key, existing)
    }

    return Array.from(groups.entries())
      .map(([key, groupTimers]) => ({
        key,
        label: groupBy === 'character' ? groupTimers[0].characterName : groupTimers[0].questName,
        timers: groupTimers.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [timers, groupBy])

  if (timers.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No ransack timers</Typography>
      </Box>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {groupBy === 'character' ? (
              <>
                {showCharacterColumn && <TableCell>Character</TableCell>}
                {showQuestColumn && <TableCell>Quest</TableCell>}
              </>
            ) : (
              <>
                {showQuestColumn && <TableCell>Quest</TableCell>}
                {showCharacterColumn && <TableCell>Character</TableCell>}
              </>
            )}
            <TableCell>Time Remaining</TableCell>
            <TableCell>Expires</TableCell>
            <TableCell width={50}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groupedTimers.map((group) =>
            group.timers.map((timer, index) => (
              <TableRow key={timer.id}>
                {groupBy === 'character' ? (
                  <>
                    {showCharacterColumn && (
                      <TableCell>
                        {index > 0 ? '' : timer.characterName}
                      </TableCell>
                    )}
                    {showQuestColumn && (
                      <TableCell>{timer.questName}</TableCell>
                    )}
                  </>
                ) : (
                  <>
                    {showQuestColumn && (
                      <TableCell>
                        {index > 0 ? '' : timer.questName}
                      </TableCell>
                    )}
                    {showCharacterColumn && (
                      <TableCell>{timer.characterName}</TableCell>
                    )}
                  </>
                )}
                <TableCell>
                  <Typography
                    component="span"
                    sx={{ color: getTimeRemainingColor(timer.expiresAt), fontWeight: 500 }}
                  >
                    {formatTimeRemaining(timer.expiresAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={formatLocalDateTime(timer.expiresAt)} arrow>
                    <Box component="span" sx={{ cursor: 'help' }}>
                      {formatLocalDateTime(timer.expiresAt)}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => timer.id && onDelete(timer.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
