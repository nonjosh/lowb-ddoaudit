import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { EXPECTED_PLAYERS, getPlayerName } from '../raidLogic'

function isRaidQuest(quest) {
  const type = String(quest?.type ?? '').trim().toLowerCase()
  return type.includes('raid')
}

function getEffectiveLevel(lfm, quest) {
  const questLevel = quest?.level
  if (typeof questLevel === 'number') return questLevel

  const max = lfm?.maximum_level
  if (typeof max === 'number') return max
  const min = lfm?.minimum_level
  if (typeof min === 'number') return min

  return null
}

function getGroupNames(lfm) {
  const names = []
  const leaderName = lfm?.leader?.name
  if (leaderName) names.push(leaderName)

  for (const m of lfm?.members ?? []) {
    if (m?.name) names.push(m.name)
  }

  return names
}

/**
 * Best-effort: skull count is typically embedded in the LFM comment (e.g. "R10", "Reaper 3").
 * @param {string} text
 */
function parseReaperSkulls(text) {
  const s = String(text ?? '')
  if (!s) return null

  // Capture 1-10 in common formats: R10, R 5, Reaper1, Reaper 3
  const re = /\b(?:r|reaper)\s*([1-9]|10)\b/gi
  let m
  let best = null
  while ((m = re.exec(s))) {
    const n = Number.parseInt(m[1], 10)
    if (!Number.isFinite(n)) continue
    best = best === null ? n : Math.max(best, n)
  }
  return best
}

export default function LfmRaidsSection({ loading, hasFetched, lfmsById, questsById, error }) {
  const [questFilter, setQuestFilter] = useState('raid')
  const rawCount = useMemo(() => Object.keys(lfmsById ?? {}).length, [lfmsById])

  const raidLfms = useMemo(() => {
    const lfms = Object.values(lfmsById ?? {})
    const PARTY_SIZE = 6
    const RAID_SIZE = 12

    const normalized = []
    for (const lfm of lfms) {
      const questId = String(lfm?.quest_id ?? '')
      if (!questId) continue

      const quest = questsById?.[questId] ?? null
      const isRaid = isRaidQuest(quest)

      const maxPlayers = isRaid ? RAID_SIZE : PARTY_SIZE

      const level = getEffectiveLevel(lfm, quest)

      const leaderName = String(lfm?.leader?.name ?? '').trim() || '—'
      const leaderGuildName = String(lfm?.leader?.guild_name ?? '').trim() || ''
      const minLevel = typeof lfm?.minimum_level === 'number' ? lfm.minimum_level : null
      const maxLevel = typeof lfm?.maximum_level === 'number' ? lfm.maximum_level : null
      const comment = String(lfm?.comment ?? '').trim() || ''

      const difficulty = String(lfm?.difficulty ?? '').trim() || '—'
      const reaperSkulls = difficulty.toLowerCase() === 'reaper' ? parseReaperSkulls(comment) : null
      const difficultyDisplay =
        difficulty.toLowerCase() === 'reaper' && typeof reaperSkulls === 'number'
          ? `Reaper ${reaperSkulls}`
          : difficulty

      const memberCount = 1 + (lfm?.members?.length ?? 0)

      /** @type {Map<string, number>} */
      const guildCounts = new Map()
      const leaderGuild = String(lfm?.leader?.guild_name ?? '').trim()
      if (leaderGuild) guildCounts.set(leaderGuild, (guildCounts.get(leaderGuild) ?? 0) + 1)
      for (const m of lfm?.members ?? []) {
        const g = String(m?.guild_name ?? '').trim()
        if (!g) continue
        guildCounts.set(g, (guildCounts.get(g) ?? 0) + 1)
      }

      let majorityGuildName = ''
      let majorityGuildCount = 0
      for (const [g, c] of guildCounts.entries()) {
        if (c > majorityGuildCount) {
          majorityGuildName = g
          majorityGuildCount = c
        }
      }

      const hasMajorityGuild = majorityGuildCount > memberCount / 2
      const leaderGuildIsMajority =
        hasMajorityGuild && leaderGuildName && majorityGuildName && leaderGuildName === majorityGuildName

      const groupNames = getGroupNames(lfm)
      const playersInGroup = new Set(groupNames.map(getPlayerName))
      const hasFriendInside = EXPECTED_PLAYERS.some((p) => playersInGroup.has(p))

      normalized.push({
        id: String(lfm?.id ?? questId),
        questId,
        questName: quest?.name ?? `Unknown quest (${questId})`,
        questLevel: level,
        isRaid,
        difficulty,
        difficultyDisplay,
        reaperSkulls,
        leaderName,
        leaderGuildName,
        minLevel,
        maxLevel,
        comment,
        memberCount,
        maxPlayers,
        openSlots: Math.max(0, maxPlayers - memberCount),
        majorityGuildName,
        majorityGuildCount,
        hasMajorityGuild,
        leaderGuildIsMajority,
        lastUpdate: lfm?.last_update ?? null,
        hasFriendInside,
      })
    }

    normalized.sort((a, b) => {
      const aLevel = typeof a.questLevel === 'number' ? a.questLevel : -1
      const bLevel = typeof b.questLevel === 'number' ? b.questLevel : -1
      if (aLevel !== bLevel) return bLevel - aLevel

      const aTs = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0
      const bTs = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0
      if (aTs !== bTs) return bTs - aTs

      return a.questName.localeCompare(b.questName)
    })

    // Hide full groups.
    let filtered = normalized.filter((x) => (x?.openSlots ?? 0) > 0)

    // Toggle between raid-only and all quests.
    if (questFilter === 'raid') {
      filtered = filtered.filter((x) => x.isRaid)
    }

    return filtered
  }, [lfmsById, questsById, questFilter])

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>
          LFMs
        </Typography>
        {loading && <CircularProgress size={20} />}
        <Chip size="small" variant="outlined" label={`Raw: ${rawCount}`} />
        {!!raidLfms.length && <Chip size="small" variant="outlined" label={`Active: ${raidLfms.length}`} />}

        <Box sx={{ ml: 'auto' }} />
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

      {error ? <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert> : null}

      {!raidLfms.length ? (
        loading || !hasFetched ? (
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
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="lfm table">
            <TableHead>
              <TableRow>
                <TableCell>Quest</TableCell>
                <TableCell>Leader</TableCell>
                <TableCell>Difficulty</TableCell>
                <TableCell align="right">Players</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Tags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {raidLfms.map((l) => {
                return (
                  <TableRow
                    key={l.id}
                    hover
                    sx={{ bgcolor: l.hasFriendInside ? 'action.selected' : 'inherit' }}
                  >
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" noWrap>
                        {l.questName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {typeof l.questLevel === 'number' ? `Quest Lv ${l.questLevel}` : 'Quest Lv —'}
                      </Typography>
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
                    <TableCell>{l.difficultyDisplay}</TableCell>
                    <TableCell align="right">
                      {l.memberCount}/{l.maxPlayers}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" noWrap>
                        {l.comment || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {!l.isRaid ? <Chip size="small" variant="outlined" label="Non-raid" /> : <Chip size="small" variant="outlined" label="Raid" />}
                        {l.hasFriendInside ? <Chip size="small" color="primary" label="Friend inside" /> : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  )
}
