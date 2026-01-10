import RefreshIcon from '@mui/icons-material/Refresh'
import SettingsIcon from '@mui/icons-material/Settings'
import SyncIcon from '@mui/icons-material/Sync'
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, Paper, Stack, Switch, ToggleButton, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'

import { formatLocalDateTime } from '@/api/ddoAudit'
import { CHARACTERS_BY_PLAYER } from '@/config/characters'
import { useCharacter } from '@/contexts/useCharacter'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useConfig } from '@/contexts/useConfig'

interface ControlsProps {
  loading: boolean
  onRefresh: () => void
  autoRefreshEnabled: boolean
  onToggleAutoRefresh: () => void
  lastUpdatedAt: Date | null
  error: string
}

export default function Controls({
  loading,
  onRefresh,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  lastUpdatedAt,
  error,
}: ControlsProps) {
  const { showClassIcons, setShowClassIcons } = useConfig()
  const { refresh: refreshItemData, loading: itemDataLoading, items, craftingData, setsData } = useGearPlanner()
  const { charactersById } = useCharacter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const numPlayers = Object.keys(CHARACTERS_BY_PLAYER).length
  const numCharacters = Object.values(CHARACTERS_BY_PLAYER).flat().length
  const numItems = items.length
  const numCrafting = Object.keys(craftingData || {}).length
  const numSets = Object.keys(setsData || {}).length

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-start' } }}>
          <Button
            variant="contained"
            onClick={onRefresh}
            disabled={loading}
            startIcon={<RefreshIcon />}
            sx={{ minWidth: 140 }}
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
              {loading ? (
                <span>
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
                </span>
              ) : (
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
              )}
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)} size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>Display Options</Typography>
              <FormControlLabel
                control={<Switch checked={showClassIcons} onChange={() => setShowClassIcons(v => !v)} />}
                label="Show class icons"
              />
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom>Data Status</Typography>
              <Typography variant="body2">Characters loaded: {Object.keys(charactersById).length} / {numCharacters}</Typography>
              <Typography variant="body2">Players loaded: {numPlayers}</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom>Item Data Cache</Typography>
              <Typography variant="body2">Items cached: {numItems}</Typography>
              <Typography variant="body2">Crafting recipes cached: {numCrafting}</Typography>
              <Typography variant="body2">Item sets cached: {numSets}</Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => refreshItemData(true)}
                  disabled={itemDataLoading}
                  startIcon={<RefreshIcon />}
                  fullWidth
                >
                  {itemDataLoading ? 'Refreshing…' : 'Refresh Item Data'}
                </Button>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
