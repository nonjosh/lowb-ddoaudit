import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

import { EXPECTED_PLAYERS } from '../raidLogic'

interface LfmParticipant {
  characterName: string
  playerName: string
  playerDisplayName: string
  guildName: string
  totalLevel: number | null
  classesDisplay: string
  isLeader: boolean
  race?: string
}

interface LfmGroup {
  questName: string
  questLevel: number | null
  difficultyDisplay: string
  difficultyColor: string
  participants: LfmParticipant[]
}

interface LfmParticipantsDialogProps {
  selectedLfm: LfmGroup | null
  onClose: () => void
}

export default function LfmParticipantsDialog({ selectedLfm, onClose }: LfmParticipantsDialogProps) {
  return (
    <Dialog open={Boolean(selectedLfm)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="div">
            {selectedLfm?.questName || 'LFM Group'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {typeof selectedLfm?.questLevel === 'number'
                ? `Quest Lv ${selectedLfm.questLevel}`
                : 'Quest Lv —'}
            </Typography>
            {selectedLfm?.difficultyDisplay && (
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ color: selectedLfm.difficultyColor || 'text.primary' }}
              >
                {selectedLfm.difficultyDisplay}
              </Typography>
            )}
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Table size="small" aria-label="lfm members">
          <TableHead>
            <TableRow>
              <TableCell>Character</TableCell>
              <TableCell align="right" sx={{ width: 80 }}>
                Level
              </TableCell>
              <TableCell>Classes</TableCell>
              <TableCell>Race</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(selectedLfm?.participants ?? []).map((p) => (
              <TableRow key={`${p.characterName}:${p.playerName}`}>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" noWrap>
                        {p.characterName}
                      </Typography>
                      {EXPECTED_PLAYERS.includes(p.playerName) ? (
                        <Chip size="small" color="success" label={p.playerDisplayName} />
                      ) : null}
                      {p.isLeader ? <Chip size="small" variant="outlined" label="Leader" /> : null}
                    </Stack>
                    {p.guildName ? (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {p.guildName}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell align="right">{typeof p.totalLevel === 'number' ? p.totalLevel : '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {p.classesDisplay || '—'}
                  </Typography>
                </TableCell>
                <TableCell>{p.race}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
