import GroupAddIcon from '@mui/icons-material/GroupAdd'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Fragment, useEffect, useMemo, useState } from 'react'

import { Quest } from '@/api/ddoAudit'
import ItemLootButton from '@/components/items/ItemLootButton'
import QuestTierFilter from '@/components/shared/QuestTierFilter'
import { filterAndSortLfms, NormalizedLfm, normalizeLfm } from '@/domains/lfm/lfmHelpers'
import { getPlayerDisplayName, groupEntriesByPlayer } from '@/domains/raids/raidLogic'

import LfmParticipantsDialog from './LfmParticipantsDialog'

interface LfmRaidsSectionProps {
  loading: boolean
  hasFetched: boolean
  lfmsById: Record<string, unknown>
  questsById: Record<string, Quest>
  error: string
  serverPlayers?: number | null
  isServerOnline?: boolean | null
  raidGroups: RaidGroup[]
}


export default function LfmRaidsSection({ loading, hasFetched, lfmsById, questsById, error, serverPlayers, isServerOnline, raidGroups }: LfmRaidsSectionProps) {
  const [now, setNow] = useState(() => new Date())
  const [questFilter, setQuestFilter] = useState('raid')
  const [tierFilter, setTierFilter] = useState('legendary')
  const [selectedLfm, setSelectedLfm] = useState<NormalizedLfm | null>(null)
  const rawCount = useMemo(() => Object.keys(lfmsById ?? {}).length, [lfmsById])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const selectedRaidData = useMemo(() => {
    if (!selectedLfm) return null
    const questId = String(selectedLfm.questId ?? '')
    const raidGroup = raidGroups.find(rg => rg.questId === questId)
    if (!raidGroup) return null
    const perPlayerEligible = groupEntriesByPlayer(raidGroup.entries, now)
    return { raidGroup, perPlayerEligible }
  }, [selectedLfm, raidGroups, now])

  const raidLfms = useMemo(() => {
    const lfms = Object.values(lfmsById ?? {})
    const normalized: NormalizedLfm[] = []
    for (const lfm of lfms) {
      const quest = questsById?.[String(lfm?.quest_id ?? '')] ?? null
      const normalizedLfm = normalizeLfm(lfm, quest)
      if (normalizedLfm) normalized.push(normalizedLfm)
    }

    return filterAndSortLfms(normalized, questFilter, tierFilter)
  }, [lfmsById, questsById, questFilter, tierFilter])

  const shownCount = raidLfms.length
  const totalCount = rawCount

  // If server is offline, show message and do not render LFM table.
  if (isServerOnline === false) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <GroupAddIcon />
          <Typography variant="h5" sx={{ mb: 0 }}>
            LFMs
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mt: 2 }}>
          The Shadowdale server is currently <b>offline</b>. LFM data is unavailable.
        </Alert>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupAddIcon />
          <Typography variant="h5" sx={{ mb: 0 }}>
            LFMs
          </Typography>
        </Box>
        <Chip size="small" variant="outlined" label={`Showing ${shownCount} out of ${totalCount}`} />
        <Chip size="small" variant="outlined" label={`Players: ${serverPlayers ?? '—'}`} sx={{ ml: 1 }} />
        {loading && <CircularProgress size={20} />}

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <QuestTierFilter value={tierFilter} onChange={setTierFilter} />

          <ToggleButtonGroup
            size="small"
            value={questFilter}
            exclusive
            onChange={(_, v) => {
              if (v) setQuestFilter(v)
            }}
            aria-label="quest filter"
          >
            <ToggleButton value="raid" aria-label="raids only">
              Raids
            </ToggleButton>
            <ToggleButton value="all" aria-label="all quests">
              All
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {error ? <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert> : null}

      {!raidLfms.length ? (
        !hasFetched ? (
          <Stack spacing={1.5}>
            {[1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No open LFMs found.
          </Typography>
        )
      ) : (
        <TableContainer component={Box} sx={{ mt: 1 }}>
          <Table size="small" aria-label="lfm table">
            <TableHead>
              <TableRow>
                <TableCell>Quest</TableCell>
                <TableCell>Leader</TableCell>
                <TableCell align="right" sx={{ width: 96 }} />
                <TableCell>Comment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {raidLfms.map((l) => (
                <Fragment key={l.id}>
                  <TableRow
                    hover
                    sx={{
                      bgcolor: 'inherit',
                      ...(l.hasFriendInside && {
                        boxShadow: (theme) =>
                          `inset 0 2px 0 0 ${theme.palette.success.main}, inset 2px 0 0 0 ${theme.palette.success.main}, inset -2px 0 0 0 ${theme.palette.success.main}`,
                      }),
                    }}
                    onClick={() => setSelectedLfm(l)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ maxWidth: 320 }}>
                      {l.questName ? (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                              {l.questName}
                            </Typography>
                            <ItemLootButton questName={l.questName} />
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {typeof l.questLevel === 'number' ? `Quest Lv ${l.questLevel}` : 'Quest Lv —'}
                            </Typography>
                            <Typography variant="caption" fontWeight={600} sx={{ color: l.difficultyColor }}>
                              {l.difficultyDisplay}
                            </Typography>
                            {l.isRaid && questFilter !== 'raid' ? (
                              <Chip size="small" variant="outlined" label="Raid" />
                            ) : null}
                          </Stack>
                        </>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {l.leaderName}
                      </Typography>
                      {l.leaderGuildName ? (
                        <Typography
                          variant="caption"
                          color={l.leaderGuildIsMajority ? 'primary' : 'text.secondary'}
                          sx={l.leaderGuildIsMajority ? { fontWeight: 600 } : undefined}
                          noWrap
                        >
                          {l.leaderGuildName}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">
                      {l.memberCount}/{l.maxPlayers}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" noWrap>
                          {l.comment || '—'}
                        </Typography>
                        {typeof l.adventureActiveMinutes === 'number' ? (
                          <Typography variant="caption" sx={{ color: 'info.main' }} noWrap>
                            Active {l.adventureActiveMinutes} min
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>

                  {Array.isArray(l.friendPlayersInside) && l.friendPlayersInside.length ? (
                    <TableRow
                      hover
                      sx={{
                        bgcolor: 'inherit',
                        boxShadow: (theme) =>
                          `inset 0 -2px 0 0 ${theme.palette.success.main}, inset 2px 0 0 0 ${theme.palette.success.main}, inset -2px 0 0 0 ${theme.palette.success.main}`,
                      }}
                      onClick={() => setSelectedLfm(l)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell colSpan={4} sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="caption" color="text.secondary">
                            Friends inside:
                          </Typography>
                          {l.friendPlayersInside.map((p) => (
                            <Chip
                              key={p}
                              size="small"
                              color="success"
                              variant="outlined"
                              label={getPlayerDisplayName(p)}
                            />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <LfmParticipantsDialog selectedLfm={selectedLfm} onClose={() => setSelectedLfm(null)} selectedRaidData={selectedRaidData} />
    </Paper>
  )
}
