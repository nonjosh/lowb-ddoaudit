import { Alert, Button, Chip, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'

import { formatLocalDateTime } from '../ddoAuditApi'

interface ControlsProps {
  loading: boolean
  onRefresh: () => void
  autoRefreshEnabled: boolean
  onToggleAutoRefresh: () => void
  showClassIcons: boolean
  onToggleShowClassIcons: () => void
  characterCount: number
  raidCount: number
  lastUpdatedAt: Date | null
  error: string
}

export default function Controls({
  loading,
  onRefresh,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  showClassIcons,
  onToggleShowClassIcons,
  characterCount,
  raidCount,
  lastUpdatedAt,
  error,
}: ControlsProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          <Button 
            variant="contained" 
            onClick={onRefresh} 
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            {loading ? 'Refreshing…' : 'Refresh data'}
          </Button>
          <FormControlLabel
            control={<Switch checked={autoRefreshEnabled} onChange={onToggleAutoRefresh} disabled={loading} />}
            label="Auto refresh"
          />
          <FormControlLabel
            control={<Switch checked={showClassIcons} onChange={onToggleShowClassIcons} />}
            label="Show class icons"
          />
        </Stack>
        
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label={`Characters: ${characterCount}`} variant="outlined" size="small" />
          <Chip label={`Raids: ${raidCount}`} variant="outlined" size="small" />
          <Typography variant="caption" color="text.secondary">
            Updated: {formatLocalDateTime(lastUpdatedAt, { includeSeconds: true })}
          </Typography>
        </Stack>
      </Stack>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
    </Paper>
  )
}
