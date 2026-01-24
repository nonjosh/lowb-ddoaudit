import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
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
import { useMemo, useState } from 'react'

import sagasData from '@/data/sagas.json'
import { QuestWithXP } from '@/contexts/useTRPlanner'
import { PlanMode } from '@/domains/trPlanner/levelRequirements'

interface SagaSummaryProps {
  mode: PlanMode
  selectedQuests: QuestWithXP[]
  completedQuestIds: Set<string>
  sagaFilter: string[]
  onToggleSagaFilter: (sagaName: string) => void
}

interface Saga {
  id: string
  name: string
  levelRange: string
  questCount: number
  adventurePacks: string[]
  quests: string[]
}

interface SagaProgress {
  saga: Saga
  selectedCount: number
  completedCount: number
  totalCount: number
  percentage: number
  completionPercentage: number
  missingQuests: string[]
  isFullySelected: boolean
}

export default function SagaSummary({ mode, selectedQuests, completedQuestIds, sagaFilter, onToggleSagaFilter }: SagaSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  const sagaProgressList = useMemo(() => {
    const sagas = mode === 'heroic'
      ? (sagasData.heroic as Saga[])
      : [...(sagasData.epic as Saga[]), ...(sagasData.legendary as Saga[])]

    // Build maps for selected and completed quest names
    const selectedQuestNames = new Set(selectedQuests.map((q) => q.name.toLowerCase()))
    const selectedQuestIdByName = new Map(selectedQuests.map((q) => [q.name.toLowerCase(), q.id]))

    const progressList: SagaProgress[] = []

    for (const saga of sagas) {
      const sagaQuestNames = saga.quests.map((q) => q.toLowerCase())
      const selectedInSaga = sagaQuestNames.filter((q) => selectedQuestNames.has(q))
      const completedInSaga = sagaQuestNames.filter((q) => {
        const questId = selectedQuestIdByName.get(q)
        return questId && completedQuestIds.has(questId)
      })
      const missingQuests = saga.quests.filter((q) => !selectedQuestNames.has(q.toLowerCase()))

      progressList.push({
        saga,
        selectedCount: selectedInSaga.length,
        completedCount: completedInSaga.length,
        totalCount: saga.quests.length,
        percentage: saga.quests.length > 0 ? (selectedInSaga.length / saga.quests.length) * 100 : 0,
        completionPercentage: selectedInSaga.length > 0 ? (completedInSaga.length / selectedInSaga.length) * 100 : 0,
        missingQuests,
        isFullySelected: selectedInSaga.length === saga.quests.length,
      })
    }

    // Filter out sagas with 0 selected and sort by percentage (highest first), then by name
    return progressList
      .filter((p) => p.selectedCount > 0)
      .sort((a, b) => {
        if (b.percentage !== a.percentage) {
          return b.percentage - a.percentage
        }
        return a.saga.name.localeCompare(b.saga.name)
      })
  }, [mode, selectedQuests, completedQuestIds])

  // Summary stats
  const completedSagas = sagaProgressList.filter((s) => s.percentage === 100).length
  const inProgressSagas = sagaProgressList.filter((s) => s.percentage > 0 && s.percentage < 100).length
  const totalSagas = sagaProgressList.length

  if (sagaProgressList.length === 0) {
    return null
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            Saga Progress
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              size="small"
              label={`${completedSagas} complete`}
              color="success"
              sx={{ height: 22 }}
            />
            {inProgressSagas > 0 && (
              <Chip
                size="small"
                label={`${inProgressSagas} in progress`}
                color="warning"
                sx={{ height: 22 }}
              />
            )}
            <Chip
              size="small"
              label={`${totalSagas} total`}
              sx={{ height: 22 }}
            />
          </Box>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <TableContainer sx={{ mt: 2, maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Saga</TableCell>
                <TableCell align="center">Level</TableCell>
                <TableCell align="center" sx={{ width: 200 }}>Progress</TableCell>
                <TableCell align="right">Quests</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sagaProgressList.map((progress) => {
                const isFiltered = sagaFilter.includes(progress.saga.name)
                const isIncomplete = !progress.isFullySelected

                return (
                  <TableRow
                    key={progress.saga.id}
                    sx={{
                      opacity: isIncomplete ? 0.6 : 1,
                      '& td': {
                        borderLeft: progress.percentage === 100
                          ? '4px solid'
                          : progress.percentage > 0
                            ? '4px solid'
                            : 'none',
                        borderLeftColor: progress.percentage === 100
                          ? 'success.main'
                          : 'info.main',
                      },
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={progress.percentage === 100 ? 'bold' : 'normal'}
                        color={progress.percentage === 100 ? 'success.main' : 'text.primary'}
                        onClick={() => onToggleSagaFilter(progress.saga.name)}
                        sx={{
                          cursor: 'pointer',
                          textDecoration: isFiltered ? 'underline' : 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {progress.saga.name}
                        {progress.percentage === 100 && ' ✓'}
                        {isFiltered && ' 🔍'}
                      </Typography>
                      {progress.missingQuests.length > 0 && progress.percentage > 0 && (
                        <Tooltip
                          title={
                            <Box>
                              <Typography variant="caption" fontWeight="bold">Missing quests:</Typography>
                              <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                                {progress.missingQuests.map((q) => (
                                  <li key={q}><Typography variant="caption">{q}</Typography></li>
                                ))}
                              </ul>
                            </Box>
                          }
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ cursor: 'help', textDecoration: 'underline dotted' }}
                          >
                            {progress.missingQuests.length} missing
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={progress.saga.levelRange}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, position: 'relative' }}>
                          {/* Selection progress bar */}
                          <LinearProgress
                            variant="determinate"
                            value={progress.percentage}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: progress.percentage === 100 ? 'success.main' : 'info.main',
                              },
                            }}
                          />
                          {/* Completion progress overlay */}
                          {progress.completedCount > 0 && (
                            <LinearProgress
                              variant="determinate"
                              value={(progress.completedCount / progress.totalCount) * 100}
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'transparent',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: 'success.dark',
                                },
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ minWidth: 35 }}>
                          {Math.round(progress.percentage)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={progress.completedCount > 0 ? `${progress.completedCount} completed` : ''}
                        placement="left"
                      >
                        <Typography variant="body2">
                          {progress.completedCount > 0 && (
                            <Box component="span" sx={{ color: 'success.main', mr: 0.5 }}>
                              {progress.completedCount}✓
                            </Box>
                          )}
                          {progress.selectedCount}/{progress.totalCount}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  )
}
