import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

import LfmParticipantRow from './LfmParticipantRow'
import { LfmParticipant } from './types'

interface LfmParticipantsTableProps {
  participants: LfmParticipant[]
  areas: Record<string, { name: string }>
  showClassIcons: boolean
}

export default function LfmParticipantsTable({ participants, areas, showClassIcons }: LfmParticipantsTableProps) {
  return (
    <Table size="small" aria-label="lfm members">
      <TableHead>
        <TableRow>
          <TableCell>Character</TableCell>
          <TableCell align="right" sx={{ width: 80 }}>
            Level
          </TableCell>
          <TableCell>Classes</TableCell>
          <TableCell>Race</TableCell>
          <TableCell>Location</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {participants.map((p) => (
          <LfmParticipantRow key={`${p.characterName}:${p.playerName}`} participant={p} areas={areas} showClassIcons={showClassIcons} />
        ))}
      </TableBody>
    </Table>
  )
}