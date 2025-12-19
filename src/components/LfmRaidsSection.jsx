import { Fragment, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
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
import { EXPECTED_PLAYERS, formatClasses, getPlayerDisplayName, getPlayerName } from '../raidLogic'
import LfmParticipantsDialog from './LfmParticipantsDialog'

function isRaidQuest(quest) {
  const type = String(quest?.type ?? '').trim().toLowerCase()
  return type.includes('raid')
}

function getEffectiveLevel(lfm, quest) {
  // Prefer a version-specific quest level when available.
  const leaderLevel = lfm?.leader?.total_level
  const heroicLevel = quest?.heroicLevel
  const epicLevel = quest?.epicLevel

  if (typeof heroicLevel === 'number' && typeof epicLevel === 'number') {
    // Heuristic: epic content is generally aimed at level 20+.
    if (typeof leaderLevel === 'number' && leaderLevel >= 20) return epicLevel
    return heroicLevel
  }
  if (typeof epicLevel === 'number') return epicLevel
  if (typeof heroicLevel === 'number') return heroicLevel

  // Fall back to the combined/max quest level if the split fields aren't present.
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
  const [selectedLfm, setSelectedLfm] = useState(null)
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

      const questName = String(quest?.name ?? '').trim() || ''

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

      const difficultyColor = (() => {
        const d = difficulty.toLowerCase()
        if (d === 'reaper') return 'error.main'
        if (d === 'elite') return 'warning.main'
        if (d === 'hard') return 'info.main'
        return 'text.primary'
      })()

      const memberCount = 1 + (lfm?.members?.length ?? 0)

      const participants = [lfm?.leader, ...(lfm?.members ?? [])]
        .filter(Boolean)
        .map((p) => {
          const characterName = String(p?.name ?? '').trim() || '—'
          const playerName = getPlayerName(characterName)
          const classesDisplay = formatClasses(p?.classes)
          return {
            characterName,
            playerName,
            playerDisplayName: getPlayerDisplayName(playerName),
            guildName: String(p?.guild_name ?? '').trim() || '',
            totalLevel: typeof p?.total_level === 'number' ? p.total_level : null,
            classesDisplay,
            isLeader: Boolean(lfm?.leader?.id && p?.id && p.id === lfm.leader.id),
          }
        })

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

      // Don't highlight guild "majority" when the leader is alone.
      const hasMajorityGuild = memberCount > 1 && majorityGuildCount > memberCount / 2
      const leaderGuildIsMajority =
        hasMajorityGuild && leaderGuildName && majorityGuildName && leaderGuildName === majorityGuildName

      const groupNames = getGroupNames(lfm)
      const playersInGroup = new Set(groupNames.map(getPlayerName))
      const hasFriendInside = EXPECTED_PLAYERS.some((p) => playersInGroup.has(p))

      const friendPlayersInside = Array.from(
        new Set(groupNames.map(getPlayerName).filter((p) => EXPECTED_PLAYERS.includes(p))),
      ).sort((a, b) => a.localeCompare(b))

      normalized.push({
        id: String(lfm?.id ?? questId),
        questId,
        questName,
        questLevel: level,
        isRaid,
        difficulty,
        difficultyDisplay,
        difficultyColor,
        reaperSkulls,
        leaderName,
        leaderGuildName,
        minLevel,
        maxLevel,
        comment,
        participants,
        memberCount,
        maxPlayers,
        openSlots: Math.max(0, maxPlayers - memberCount),
        majorityGuildName,
        majorityGuildCount,
        hasMajorityGuild,
        leaderGuildIsMajority,
        lastUpdate: lfm?.last_update ?? null,
        hasFriendInside,
        friendPlayersInside,
      })
    }

    // Hide full groups.
    let filtered = normalized.filter((x) => (x?.openSlots ?? 0) > 0)

    // Toggle between raid-only and all quests.
    if (questFilter === 'raid') {
      filtered = filtered.filter((x) => x.isRaid)
    }

    // Sort by quest level desc (then most recently updated, then name).
    filtered.sort((a, b) => {
      const aHasName = Boolean(String(a.questName ?? '').trim())
      const bHasName = Boolean(String(b.questName ?? '').trim())
      if (aHasName !== bHasName) return aHasName ? -1 : 1

      const aLevel = typeof a.questLevel === 'number' ? a.questLevel : -1
      const bLevel = typeof b.questLevel === 'number' ? b.questLevel : -1
      if (aLevel !== bLevel) return bLevel - aLevel

      const aTs = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0
      const bTs = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0
      if (aTs !== bTs) return bTs - aTs

      return a.questName.localeCompare(b.questName)
    })

    return filtered
  }, [lfmsById, questsById, questFilter])

  const shownCount = raidLfms.length
  const totalCount = rawCount

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>
          LFMs
        </Typography>
        {loading && <CircularProgress size={20} />}
        <Chip size="small" variant="outlined" label={`Showing ${shownCount} out of ${totalCount}`} />

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
                        outline: '2px solid',
                        outlineColor: 'success.main',
                        outlineOffset: '-2px',
                      }),
                    }}
                    onClick={() => setSelectedLfm(l)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ maxWidth: 320 }}>
                      {l.questName ? (
                        <>
                          <Typography variant="body2" noWrap>
                            {l.questName}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {typeof l.questLevel === 'number' ? `Quest Lv ${l.questLevel}` : 'Quest Lv —'}
                            </Typography>
                            <Typography variant="caption" fontWeight={600} sx={{ color: l.difficultyColor }}>
                              {l.difficultyDisplay}
                            </Typography>
                            {l.isRaid ? <Chip size="small" variant="outlined" label="Raid" /> : null}
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
                      <Typography variant="body2" noWrap>
                        {l.comment || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {Array.isArray(l.friendPlayersInside) && l.friendPlayersInside.length ? (
                    <TableRow
                      hover
                      sx={{
                        bgcolor: 'inherit',
                        outline: '2px solid',
                        outlineColor: 'success.main',
                        outlineOffset: '-2px',
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

      <LfmParticipantsDialog selectedLfm={selectedLfm} onClose={() => setSelectedLfm(null)} />
    </Paper>
  )
}
