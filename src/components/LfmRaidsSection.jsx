import { useMemo } from 'react'
import { Alert, Box, Chip, CircularProgress, Skeleton, Stack, Typography } from '@mui/material'
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

export default function LfmRaidsSection({ loading, hasFetched, lfmsById, questsById, error }) {
  const rawCount = useMemo(() => Object.keys(lfmsById ?? {}).length, [lfmsById])

  const raidLfms = useMemo(() => {
    const lfms = Object.values(lfmsById ?? {})

    const normalized = []
    for (const lfm of lfms) {
      const questId = String(lfm?.quest_id ?? '')
      if (!questId) continue

      const quest = questsById?.[questId] ?? null
      const isRaid = isRaidQuest(quest)

      const level = getEffectiveLevel(lfm, quest)

      const groupNames = getGroupNames(lfm)
      const playersInGroup = new Set(groupNames.map(getPlayerName))
      const hasFriendInside = EXPECTED_PLAYERS.some((p) => playersInGroup.has(p))

      normalized.push({
        id: String(lfm?.id ?? questId),
        questId,
        questName: quest?.name ?? `Unknown quest (${questId})`,
        questLevel: level,
        isRaid,
        difficulty: String(lfm?.difficulty ?? '').trim() || '—',
        memberCount: 1 + (lfm?.members?.length ?? 0),
        lastUpdate: lfm?.last_update ?? null,
        hasFriendInside,
      })
    }

    normalized.sort((a, b) => {
      const aTs = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0
      const bTs = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0
      if (aTs !== bTs) return bTs - aTs
      return a.questName.localeCompare(b.questName)
    })

    return normalized
  }, [lfmsById, questsById])

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>
          Raid LFMs
        </Typography>
        {loading && <CircularProgress size={20} />}
        <Chip size="small" variant="outlined" label={`Raw: ${rawCount}`} />
        {!!raidLfms.length && <Chip size="small" variant="outlined" label={`Active: ${raidLfms.length}`} />}
      </Box>

      {rawCount > 0 && raidLfms.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Loaded LFMs but none normalized. Likely missing/empty `quest_id` fields in the response.
        </Typography>
      ) : null}

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
            No LFMs found.
          </Typography>
        )
      ) : (
        <Stack spacing={1.5}>
          {raidLfms.map((l) => (
            <Box
              key={l.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
                bgcolor: l.hasFriendInside ? 'action.selected' : 'background.paper',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }} noWrap>
                    {l.questName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {typeof l.questLevel === 'number' ? `Lv ${l.questLevel} • ` : ''}
                    {l.difficulty} • Players: {l.memberCount}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  {!l.isRaid ? <Chip size="small" variant="outlined" label="Non-raid" /> : null}
                  {l.hasFriendInside ? <Chip size="small" color="primary" label="Friend inside" /> : null}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </>
  )
}
