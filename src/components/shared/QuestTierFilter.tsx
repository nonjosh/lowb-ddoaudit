import { ToggleButton, ToggleButtonGroup } from '@mui/material'

interface QuestTierFilterProps {
  value: string
  onChange: (value: string) => void
  size?: 'small' | 'medium' | 'large'
}

export default function QuestTierFilter({ value, onChange, size = 'small' }: QuestTierFilterProps) {
  return (
    <ToggleButtonGroup
      size={size}
      value={value}
      exclusive
      onChange={(_, v) => {
        if (v) onChange(v)
      }}
      aria-label="tier filter"
    >
      <ToggleButton value="heroic" aria-label="heroic tier">
        Heroic
      </ToggleButton>
      <ToggleButton value="epic" aria-label="epic tier">
        Epic
      </ToggleButton>
      <ToggleButton value="legendary" aria-label="legendary tier">
        Legendary
      </ToggleButton>
      <ToggleButton value="all" aria-label="all tiers">
        All
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
