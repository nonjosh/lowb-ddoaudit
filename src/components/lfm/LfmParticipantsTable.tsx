import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

import LfmParticipantRow from './LfmParticipantRow'
import { LfmParticipant } from '@/domains/lfm/lfmHelpers'

interface LfmParticipantsTableProps {
  participants: LfmParticipant[]
  areas: Record<string, { name: string }>
  onGuildClick?: (guildName: string) => void
  leaderGuildName?: string
}

export default function LfmParticipantsTable({ participants, areas, onGuildClick, leaderGuildName }: LfmParticipantsTableProps) {
  // Only highlight leader's guild if multiple participants share it
  const effectiveLeaderGuild = leaderGuildName
    ? participants.filter((p) => p.guildName === leaderGuildName).length > 1
      ? leaderGuildName
      : undefined
    : undefined

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
          <LfmParticipantRow key={`${p.characterName}:${p.playerName}`} participant={p} areas={areas} onGuildClick={onGuildClick} leaderGuildName={effectiveLeaderGuild} />
        ))}
      </TableBody>
    </Table>
  )
}
