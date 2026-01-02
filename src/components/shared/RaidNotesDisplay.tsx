import { Box, Typography } from '@mui/material'

import { RaidNotes } from '@/domains/raids/raidNotes'

interface RaidNotesDisplayProps {
  raidNotes: RaidNotes | null
}

export default function RaidNotesDisplay({ raidNotes }: RaidNotesDisplayProps) {
  if (!raidNotes) return null

  const renderNotesField = (label: string, items: string[] | undefined) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : []
    if (list.length === 0) return null
    return (
      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>{label}:</Typography>
        <Box>
          {list.map((x, idx) => (
            <Typography key={idx} variant="body2" component="div">{x}</Typography>
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
      {renderNotesField('Augment', raidNotes.augments)}
      {renderNotesField('Set', raidNotes.sets)}
      {renderNotesField('Notes', raidNotes.notes)}
    </Box>
  )
}