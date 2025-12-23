import RefreshIcon from '@mui/icons-material/Refresh'
import SyncIcon from '@mui/icons-material/Sync'
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled'
import { Alert, Box, Button, FormControlLabel, Paper, Stack, Switch, ToggleButton, Tooltip, Typography } from '@mui/material'

import { formatLocalDateTime } from '../../api/ddoAuditApi'

interface ControlsProps {
  loading: boolean
  onRefresh: () => void
  autoRefreshEnabled: boolean
  onToggleAutoRefresh: () => void
  showClassIcons: boolean
  onToggleShowClassIcons: () => void
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
  lastUpdatedAt,
  error,
}: ControlsProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-start' } }}>
          <Button
            variant="contained"
            onClick={onRefresh}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Box>
            <Typography variant="caption" display="block" color="text.secondary" lineHeight={1.2}>
              Last updated:
            </Typography>
            <Typography variant="body2" lineHeight={1.2}>
              {formatLocalDateTime(lastUpdatedAt, { includeSeconds: true })}
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-around', sm: 'flex-start' } }}>
            <Tooltip title={autoRefreshEnabled ? "Disable auto refresh" : "Enable auto refresh"}>
              <ToggleButton
                value="check"
                selected={autoRefreshEnabled}
                onChange={() => onToggleAutoRefresh()}
                disabled={loading}
                size="small"
                color="primary"
              >
                {autoRefreshEnabled ? <SyncIcon /> : <SyncDisabledIcon />}
              </ToggleButton>
            </Tooltip>
            <FormControlLabel
              control={<Switch size="small" checked={showClassIcons} onChange={onToggleShowClassIcons} />}
              label={<Typography variant="body2">Class icons</Typography>}
            />
          </Stack>
        </Stack>
      </Stack>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
    </Paper>
  )
}
