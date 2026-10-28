import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'

import type { AdventurePackInfo } from '@/domains/adventureLog/grouping'

interface HidePacksDialogProps {
  open: boolean
  packs: AdventurePackInfo[]
  hiddenPacks: ReadonlySet<string>
  onToggle: (pack: string) => void
  onShowAll: () => void
  onClose: () => void
}

function levelLabel(info: AdventurePackInfo): string {
  if (info.levelMin === null || info.levelMax === null) return '—'
  return info.levelMin === info.levelMax ? `${info.levelMin}` : `${info.levelMin}–${info.levelMax}`
}

export default function HidePacksDialog({
  open,
  packs,
  hiddenPacks,
  onToggle,
  onShowAll,
  onClose,
}: HidePacksDialogProps) {
  const [query, setQuery] = useState('')

  const hiddenCount = useMemo(
    () => packs.filter((info) => hiddenPacks.has(info.pack)).length,
    [packs, hiddenPacks],
  )

  const visiblePacks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return packs
    return packs.filter((info) => info.pack.toLowerCase().includes(needle))
  }, [packs, query])

  return (
    <Dialog
      open={open}
      onClose={() => {
        setQuery('')
        onClose()
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Hide adventure packs</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Hidden packs are removed from this log. The choice is stored in this browser only.
        </Typography>
        <TextField
          size="small"
          fullWidth
          label="Search packs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ mb: 1 }}
        />
        {hiddenCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            {hiddenCount} of {packs.length} packs hidden
          </Typography>
        )}
        {visiblePacks.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No packs match “{query}”.
          </Typography>
        )}
        <List dense disablePadding>
          {visiblePacks.map((info) => (
            <ListItemButton key={info.pack} onClick={() => onToggle(info.pack)}>
              <Checkbox edge="start" checked={hiddenPacks.has(info.pack)} tabIndex={-1} disableRipple />
              <ListItemText
                primary={info.pack}
                secondary={`L${levelLabel(info)} · ${info.questCount} quest${info.questCount === 1 ? '' : 's'}`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" useFlexGap flexWrap="wrap" sx={{ flex: 1 }} spacing={1}>
          <Button onClick={onShowAll} disabled={hiddenCount === 0}>
            Show all
          </Button>
        </Stack>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
