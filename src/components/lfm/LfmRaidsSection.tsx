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
import { Fragment, useMemo, useState } from 'react'
import { Quest } from '../../api/ddoAudit'
import { EXPECTED_PLAYERS } from '../../config/characters'
import { getDifficultyColor } from '../../domains/lfm/lfmHelpers'
import { getEffectiveLevel, isRaidQuest, parseReaperSkulls } from '../../domains/quests/questHelpers'
import { formatClasses, getPlayerDisplayName, getPlayerName, isLevelInTier } from '../../domains/raids/raidLogic'
import LfmParticipantsDialog from './LfmParticipantsDialog'

function getGroupNames(lfm: any) {
  const names = []
  const leaderName = lfm?.leader?.name
  if (leaderName) names.push(leaderName)

  for (const m of lfm?.members ?? []) {
    if (m?.name) names.push(m.name)
  }

  return names
}

interface LfmRaidsSectionProps {
  loading: boolean
  hasFetched: boolean
  lfmsById: Record<string, any>
  questsById: Record<string, Quest>
  error: string
  showClassIcons: boolean
  serverPlayers?: number | null
  isServerOnline?: boolean | null
}


export default function LfmRaidsSection({ loading, hasFetched, lfmsById, questsById, error, showClassIcons, serverPlayers, isServerOnline }: LfmRaidsSectionProps) {
  const [questFilter, setQuestFilter] = useState('raid')
  const [tierFilter, setTierFilter] = useState('legendary')
  const [selectedLfm, setSelectedLfm] = useState<any | null>(null)
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

      const difficultyColor = getDifficultyColor(difficulty)
      const adventureActiveRaw = lfm?.adventure_active_time
      const adventureActiveSeconds = typeof adventureActiveRaw === 'string' ? Number(adventureActiveRaw) : adventureActiveRaw
      let adventureActiveMinutes: number | null = null
      if (typeof adventureActiveSeconds === 'number' && !Number.isNaN(adventureActiveSeconds)) {
        const minutes = Math.max(0, Math.round(adventureActiveSeconds / 60))
        adventureActiveMinutes = minutes > 0 ? minutes : null
      }

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
            classes: p?.classes,
            isLeader: Boolean(lfm?.leader?.id && p?.id && p.id === lfm.leader.id),
            race: p?.race ?? 'Unknown',
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
      const hasMajorityGuild = memberCount > 1 && majorityGuildCount >= 3
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
        adventurePack: quest?.required_adventure_pack ?? null,
        questLevel: level,
        isRaid,
        difficulty,
        difficultyDisplay,
        difficultyColor,
        adventureActiveMinutes,
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

    // Filter by tier based on quest level.
    // heroic: <20, epic: 20-29, legendary: >30
    if (typeof tierFilter === 'string' && tierFilter !== 'all') {
      filtered = filtered.filter((x) => isLevelInTier(typeof x.questLevel === 'number' ? x.questLevel : null, tierFilter))
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
          <ToggleButtonGroup
            size="small"
            value={tierFilter}
            exclusive
            onChange={(_, v) => {
              if (v) setTierFilter(v)
            }}
            aria-label="tier filter"
          >
            <ToggleButton value="heroic" aria-label="heroic tier">
              Heroic
            </ToggleButton>
            <ToggleButton value="epic" aria-label="epic tier">
              Epic
            </ToggleButton>
            <ToggleButton value="legendary" aria-label="legendary tier">
              Legendary
            </ToggleButton>
            <ToggleButton value="all" aria-label="all tiers">
              All
            </ToggleButton>
          </ToggleButtonGroup>

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

      <LfmParticipantsDialog selectedLfm={selectedLfm} onClose={() => setSelectedLfm(null)} showClassIcons={showClassIcons} />
    </Paper>
  )
}
