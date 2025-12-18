import RaidCard from './RaidCard'
import { Typography, Box, Stack } from '@mui/material'

export default function RaidsSection({ raidGroups, now, isRaidCollapsed, toggleRaidCollapsed, isPlayerCollapsed, togglePlayerCollapsed }) {
  return (
    <>
      <Typography variant="h5" gutterBottom>Raids</Typography>
      {!raidGroups.length ? (
        <Typography variant="body2" color="text.secondary">No raid activity found for those character IDs.</Typography>
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
