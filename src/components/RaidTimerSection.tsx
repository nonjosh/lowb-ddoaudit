import RaidCard from './RaidCard'
import { Typography, Box, Stack, CircularProgress, Skeleton } from '@mui/material'
import { RaidGroup } from '../raidLogic'

interface RaidTimerSectionProps {
  loading: boolean
  hasFetched: boolean
  raidGroups: RaidGroup[]
  now: Date
  isRaidCollapsed: (questId: string) => boolean
  toggleRaidCollapsed: (questId: string) => void
  isPlayerCollapsed: (questId: string, playerName: string) => boolean
  togglePlayerCollapsed: (questId: string, playerName: string) => void
}

export default function RaidTimerSection({ loading, hasFetched, raidGroups, now, isRaidCollapsed, toggleRaidCollapsed, isPlayerCollapsed, togglePlayerCollapsed }: RaidTimerSectionProps) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>Raid Timers</Typography>
        {loading && <CircularProgress size={20} />}
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
          {raidGroups.map((g) => (
            <Box key={g.questId}>
              <RaidCard
                raidGroup={g}
                now={now}
                isRaidCollapsed={isRaidCollapsed(g.questId)}
                onToggleRaid={() => toggleRaidCollapsed(g.questId)}
                isPlayerCollapsed={isPlayerCollapsed}
                onTogglePlayer={togglePlayerCollapsed}
              />
            </Box>
          ))}
        </Stack>
      )}
    </>
  )
}
