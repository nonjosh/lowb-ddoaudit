import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Item } from '../../utils/itemLootHelpers'

interface ItemDetailsDialogProps {
  open: boolean
  onClose: () => void
  item: Item | null
}

export default function ItemDetailsDialog({ open, onClose, item }: ItemDetailsDialogProps) {
  if (!item) return null

  const wikiUrl = item.url ? `https://ddowiki.com${item.url}` : null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" sx={{ pr: 2 }}>
            {item.name}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Basic Info */}
          <Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Minimum Level: ${item.ml}`} color="primary" />
              {item.slot && <Chip label={`Slot: ${item.slot}`} variant="outlined" />}
              {item.type && <Chip label={item.type} variant="outlined" />}
            </Stack>
          </Box>

          {/* Quests */}
          {item.quests && item.quests.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Obtained from:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {item.quests.map((quest, idx) => (
                  <Chip key={idx} label={quest} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          <Divider />

          {/* Affixes */}
          {item.affixes && item.affixes.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Properties:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {item.affixes.map((affix, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{affix.name}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {affix.type}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {typeof affix.value === 'boolean' 
                            ? (affix.value ? '✓' : '✗')
                            : affix.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Wiki Link */}
          {wikiUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Link
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  textDecoration: 'none',
                }}
              >
                <Typography variant="body2">View on DDO Wiki</Typography>
                <OpenInNewIcon fontSize="small" />
              </Link>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
