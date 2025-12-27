import TimerIcon from '@mui/icons-material/Timer'
import { Box, Chip, CircularProgress, Skeleton, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useMemo, useState } from 'react'

import { EXPECTED_PLAYERS } from '../../config/characters'
import { useCharacter } from '../../contexts/CharacterContext'
import { RaidGroup } from '../../domains/raids/raidLogic'
import RaidCard from './RaidCard'

interface RaidTimerSectionProps {
  loading: boolean
  hasFetched: boolean
  raidGroups: RaidGroup[]
  now: Date
  isRaidCollapsed: (questId: string) => boolean
  toggleRaidCollapsed: (questId: string) => void
  isPlayerCollapsed: (questId: string, playerName: string) => boolean
  togglePlayerCollapsed: (questId: string, playerName: string) => void
  showClassIcons: boolean
}

export default function RaidTimerSection({ loading, hasFetched, raidGroups, now, isRaidCollapsed, toggleRaidCollapsed, isPlayerCollapsed, togglePlayerCollapsed, showClassIcons }: RaidTimerSectionProps) {
  /**
   * Raid sorting rules
   *
   * The UI displays raids in the following preferred order:
   *  1. Raids that contain any of the `EXPECTED_PLAYERS` currently in-raid (friends) — highest priority.
   *  2. Raids that have active LFMs (looking-for-members) — medium priority.
   *  3. All remaining raids — lowest priority.
   *
   * The sort is stable: when two raids have equal priority their original order is preserved.
   */
  const { lfms } = useCharacter()

  const [tierFilter, setTierFilter] = useState('legendary')

  const sortedRaidGroups = useMemo(() => {
    const lfmsById = lfms ?? {}
    const list = raidGroups
      .map((g, idx) => {
        const hasFriendInside = (g.entries ?? []).some((e) => EXPECTED_PLAYERS.includes(e.playerName) && Boolean(e.isInRaid))
        const hasLfm = Boolean(lfmsById[g.questId] || Object.values(lfmsById ?? {}).some((l: any) => String(l?.quest_id ?? '') === String(g.questId)))
        return { g, idx, hasFriendInside, hasLfm }
      })
      .filter((item) => {
        if (!tierFilter || tierFilter === 'all') return true
        const lvl = typeof item.g.questLevel === 'number' ? item.g.questLevel : null
        if (lvl === null) return false
        if (tierFilter === 'heroic') return lvl < 20
        if (tierFilter === 'epic') return lvl >= 20 && lvl <= 29
        if (tierFilter === 'legendary') return lvl > 30
        return true
      })

    list.sort((a, b) => {
      if (a.hasFriendInside !== b.hasFriendInside) return a.hasFriendInside ? -1 : 1
      if (a.hasLfm !== b.hasLfm) return a.hasLfm ? -1 : 1
      return a.idx - b.idx
    })

    return list.map((x) => x.g)
  }, [raidGroups, lfms, tierFilter])
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimerIcon />
          <Typography variant="h5" sx={{ mb: 0 }}>Raid Timers</Typography>
        </Box>
        <Chip label={raidGroups.length} size="small" variant="outlined" />
        {loading && <CircularProgress size={20} />}
        <Box sx={{ ml: 'auto' }}>
          <ToggleButtonGroup
            size="small"
            value={tierFilter}
            exclusive
            onChange={(_, v) => {
              if (v) setTierFilter(v)
            }}
            aria-label="tier filter"
          >
            <ToggleButton value="heroic" aria-label="heroic tier">Heroic</ToggleButton>
            <ToggleButton value="epic" aria-label="epic tier">Epic</ToggleButton>
            <ToggleButton value="legendary" aria-label="legendary tier">Legendary</ToggleButton>
            <ToggleButton value="all" aria-label="all tiers">All</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {!raidGroups.length ? (
        (loading || !hasFetched) ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No raid activity found for those character IDs.
          </Typography>
        )
      ) : (
        <Stack spacing={2}>
          {sortedRaidGroups.map((g) => (
            <Box key={g.questId}>
              <RaidCard
                raidGroup={g}
                now={now}
                isRaidCollapsed={isRaidCollapsed(g.questId)}
                onToggleRaid={() => toggleRaidCollapsed(g.questId)}
                isPlayerCollapsed={isPlayerCollapsed}
                onTogglePlayer={togglePlayerCollapsed}
                showClassIcons={showClassIcons}
              />
            </Box>
          ))}
        </Stack>
      )}
    </>
  )
}
