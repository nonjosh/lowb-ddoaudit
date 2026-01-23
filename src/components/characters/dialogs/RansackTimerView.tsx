import AddIcon from '@mui/icons-material/Add'
import { Box, Button, ToggleButton, ToggleButtonGroup } from '@mui/material'
import React, { useMemo, useState } from 'react'

import { Character } from '@/contexts/useCharacter'
import { useRansack } from '@/contexts/useRansack'

import AddRansackTimerDialog from './AddRansackTimerDialog'
import RansackTimerTable from './RansackTimerTable'

interface RansackTimerViewProps {
  playerName: string
  characters: Character[]
}

export default function RansackTimerView({ playerName, characters }: RansackTimerViewProps) {
  const { getTimersForPlayer, deleteTimer } = useRansack()
  const [groupBy, setGroupBy] = useState<'character' | 'quest'>('character')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const timers = getTimersForPlayer(playerName)

  // Find active quest from online character's location_id
  const activeQuestId = useMemo(() => {
    const onlineChar = characters.find((c) => c.is_online && c.location_id)
    return onlineChar?.location_id
  }, [characters])

  const handleGroupByChange = (_: React.MouseEvent<HTMLElement>, newValue: 'character' | 'quest' | null) => {
    if (newValue) {
      setGroupBy(newValue)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={groupBy}
          exclusive
          onChange={handleGroupByChange}
          size="small"
        >
          <ToggleButton value="character">By Character</ToggleButton>
          <ToggleButton value="quest">By Quest</ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Timer
        </Button>
      </Box>

      <RansackTimerTable
        timers={timers}
        onDelete={deleteTimer}
        groupBy={groupBy}
        showCharacterColumn={groupBy === 'quest' || timers.length > 0}
        showQuestColumn={groupBy === 'character' || timers.length > 0}
      />

      <AddRansackTimerDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        playerName={playerName}
        characters={characters}
        defaultQuestId={activeQuestId}
      />
    </Box>
  )
}
