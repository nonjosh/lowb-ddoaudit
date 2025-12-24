import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material'

import { formatAge, formatLocalDateTime } from '../../api/ddoAudit'
import ClassDisplay from '../shared/ClassDisplay'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface PlayerCharactersDialogProps {
  open: boolean
  onClose: () => void
  playerName: string
  characters: any[]
  showClassIcons: boolean
}

export default function PlayerCharactersDialog({ open, onClose, playerName, characters, showClassIcons }: PlayerCharactersDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {playerName ?? ''}
          <Chip label={characters.length} size="small" variant="outlined" />
        </Box>
      </DialogTitle>
      <DialogContent>
        {Array.isArray(characters) && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Classes</TableCell>
                  <TableCell>Race</TableCell>
                  <TableCell>Last online</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {characters
                  .slice()
                  .sort((a, b) => {
                    if (a.is_online !== b.is_online) return a.is_online ? -1 : 1
                    return new Date(b.last_update).getTime() - new Date(a.last_update).getTime()
                  })
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {c.name}
                          {c.is_online && <FiberManualRecordIcon color="success" sx={{ width: 10, height: 10 }} />}
                        </Box>
                      </TableCell>
                      <TableCell>{c.total_level}</TableCell>
                      <TableCell>
                        <ClassDisplay classes={c.classes} showIcons={showClassIcons} />
                      </TableCell>
                      <TableCell>{c.race}</TableCell>
                      <TableCell>
                        {(() => {
                          if (c.is_online) return 'Online'

                          const updatedAt = new Date(c.last_update)
                          if (Number.isNaN(updatedAt.getTime())) return '—'

                          const ageMs = Date.now() - updatedAt.getTime()
                          const exact = formatLocalDateTime(c.last_update)

                          if (ageMs >= 0 && ageMs <= WEEK_MS) {
                            const relative = formatAge(c.last_update)
                            const relativeWithAgo = relative === '—' ? exact : `${relative} ago`
                            return (
                              <Tooltip title={exact} arrow>
                                <Box component="span" sx={{ cursor: 'help' }}>
                                  {relativeWithAgo}
                                </Box>
                              </Tooltip>
                            )
                          }

                          return exact
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
