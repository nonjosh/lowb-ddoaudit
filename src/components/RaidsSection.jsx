import RaidCard from './RaidCard'
import { Typography, Box, Stack, CircularProgress, Skeleton } from '@mui/material'

export default function RaidsSection({ loading, hasFetched, raidGroups, now, isRaidCollapsed, toggleRaidCollapsed, isPlayerCollapsed, togglePlayerCollapsed }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>Raids</Typography>
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
