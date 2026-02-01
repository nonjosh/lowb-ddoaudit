import { FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'

import { FightingStyle, getFightingStyleName } from '@/domains/gearPlanner/fightingStyles'

interface FightingStyleSelectorProps {
  value: FightingStyle
  onChange: (style: FightingStyle) => void
  disabled?: boolean
}

export default function FightingStyleSelector({
  value,
  onChange,
  disabled
}: FightingStyleSelectorProps) {
  const styles: FightingStyle[] = ['none', 'unarmed', 'swf', 'twf', 'thf', 'snb', 'ranged']

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>Fighting Style</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as FightingStyle)}
        label="Fighting Style"
      >
        {styles.map(style => (
          <MenuItem key={style} value={style}>
            {getFightingStyleName(style)}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        Determines which weapon combinations are allowed
      </Typography>
    </FormControl>
  )
}
