import { Box, Typography } from '@mui/material'

export default function GearPlanner() {
  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <Typography variant="h4" color="text.secondary" gutterBottom>
        Gear Planner
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Coming soon...
      </Typography>
    </Box>
  )
}
