import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Tooltip,
  Typography,
} from '@mui/material'
import { ChangeEvent } from 'react'

import { PlanMode } from '@/domains/trPlanner/levelRequirements'
import { XPBonusConfig } from '@/domains/trPlanner/xpCalculator'

interface BonusConfigPanelProps {
  bonuses: XPBonusConfig
  mode: PlanMode
  onUpdateBonus: <K extends keyof XPBonusConfig>(key: K, value: XPBonusConfig[K]) => void
  bonusPercentage?: number // Total bonus percentage (e.g., 5.1 = 510%)
}

export default function BonusConfigPanel({ bonuses, mode, onUpdateBonus, bonusPercentage }: BonusConfigPanelProps) {
  const handleCheckboxChange = (key: keyof XPBonusConfig) => (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateBonus(key, event.target.checked as XPBonusConfig[typeof key])
  }

  const handleSelectChange = <K extends keyof XPBonusConfig>(key: K) => (event: SelectChangeEvent) => {
    const value = event.target.value
    if (key === 'xpElixir' || key === 'groupBonusPlayers') {
      onUpdateBonus(key, parseInt(value, 10) as XPBonusConfig[K])
    } else {
      onUpdateBonus(key, value as XPBonusConfig[K])
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">XP Bonuses</Typography>
        {bonusPercentage !== undefined && (
          <Chip
            label={`+${Math.round((bonusPercentage - 1) * 100)}%`}
            color="primary"
            size="small"
          />
        )}
      </Box>

      {/* Row 1: Dropdowns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        <Tooltip title="Bonus for running the quest for the first time on this difficulty" arrow placement="top">
          <FormControl size="small" fullWidth>
            <InputLabel>First-Time</InputLabel>
            <Select
              value={bonuses.firstTimeCompletion}
              label="First-Time"
              onChange={handleSelectChange('firstTimeCompletion')}
            >
              <MenuItem value="none">None (0%)</MenuItem>
              <MenuItem value="casual">Casual (20%)</MenuItem>
              <MenuItem value="normal">Normal (20%)</MenuItem>
              <MenuItem value="hard">Hard (20%)</MenuItem>
              <MenuItem value="elite">Elite (45%)</MenuItem>
              <MenuItem value="reaper">Reaper (45%)</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>

        <Tooltip title="Bravery/Streak Bonus for running at highest difficulty/level" arrow placement="top">
          <FormControl size="small" fullWidth>
            <InputLabel>Delving</InputLabel>
            <Select
              value={bonuses.delvingBonus}
              label="Delving"
              onChange={handleSelectChange('delvingBonus')}
            >
              <MenuItem value="none">None (0%)</MenuItem>
              <MenuItem value="half">Half (75%)</MenuItem>
              <MenuItem value="full">Full (150%)</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>

        <Tooltip title="Permanent XP bonus from Tome of Learning" arrow placement="top">
          <FormControl size="small" fullWidth>
            <InputLabel>Tome</InputLabel>
            <Select
              value={bonuses.tomeOfLearning}
              label="Tome"
              onChange={handleSelectChange('tomeOfLearning')}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="lesser">Lesser ({mode === 'heroic' ? '25%' : '15%'})</MenuItem>
              <MenuItem value="greater">Greater ({mode === 'heroic' ? '50%' : '25%'})</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>

        <Tooltip title="XP Potion bonus" arrow placement="top">
          <FormControl size="small" fullWidth>
            <InputLabel>XP Elixir</InputLabel>
            <Select
              value={String(bonuses.xpElixir)}
              label="XP Elixir"
              onChange={handleSelectChange('xpElixir')}
            >
              <MenuItem value="0">None</MenuItem>
              <MenuItem value="10">10%</MenuItem>
              <MenuItem value="20">20%</MenuItem>
              <MenuItem value="30">30%</MenuItem>
              <MenuItem value="50">50%</MenuItem>
            </Select>
          </FormControl>
        </Tooltip>
      </Box>

      {/* Row 2: Checkboxes - Additive */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          Additive Bonuses:
        </Typography>
        <Tooltip title="Kill most monsters" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.conquest} onChange={handleCheckboxChange('conquest')} />}
            label={<Typography variant="body2">Conquest (25%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="Find secret doors or disable traps" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.ingeniousDebilitation} onChange={handleCheckboxChange('ingeniousDebilitation')} />}
            label={<Typography variant="body2">Ingenious (30%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="Break breakables" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.ransackBonus} onChange={handleCheckboxChange('ransackBonus')} />}
            label={<Typography variant="body2">Ransack (15%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="Complete without re-entering" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.persistenceBonus} onChange={handleCheckboxChange('persistenceBonus')} />}
            label={<Typography variant="body2">Persistence (10%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="Complete without any deaths" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.flawlessVictory} onChange={handleCheckboxChange('flawlessVictory')} />}
            label={<Typography variant="body2">Flawless (10%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="First completion of the day bonus" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.dailyBonus} onChange={handleCheckboxChange('dailyBonus')} />}
            label={<Typography variant="body2">Daily ({mode === 'heroic' ? '25%' : '40%'})</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
      </Box>

      {/* Row 3: Checkboxes - Multiplicative */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          Multiplicative Bonuses:
        </Typography>
        <Tooltip title="Voice of the Master / Master's Gift" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.voiceOfTheMaster} onChange={handleCheckboxChange('voiceOfTheMaster')} />}
            label={<Typography variant="body2">VotM (5%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="Guild Airship buff" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.shipBuff} onChange={handleCheckboxChange('shipBuff')} />}
            label={<Typography variant="body2">Ship (5%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="DDO VIP subscription status" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.vipBonus} onChange={handleCheckboxChange('vipBonus')} />}
            label={<Typography variant="body2">VIP (10%)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        <Tooltip title="Bonus for having VIPs in your party" arrow placement="top">
          <FormControlLabel
            control={<Checkbox size="small" checked={bonuses.vipGroupBonus} onChange={handleCheckboxChange('vipGroupBonus')} />}
            label={<Typography variant="body2">VIP Group (1%/player)</Typography>}
            sx={{ mr: 2 }}
          />
        </Tooltip>
        {bonuses.vipGroupBonus && (
          <Tooltip title="Number of players in party" arrow placement="top">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Players</InputLabel>
              <Select
                value={String(bonuses.groupBonusPlayers)}
                label="Players"
                onChange={handleSelectChange('groupBonusPlayers')}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
                  <MenuItem key={n} value={String(n)}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Tooltip>
        )}
      </Box>
    </Paper>
  )
}
