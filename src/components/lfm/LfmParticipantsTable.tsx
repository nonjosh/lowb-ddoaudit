import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { useMemo } from 'react'

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

  // Leader first, then members in join order (API array order)
  const sortedParticipants = useMemo(
    () => participants.slice().sort((a, b) => {
      if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1
      return 0
    }),
    [participants],
  )

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
        {sortedParticipants.map((p) => (
          <LfmParticipantRow key={`${p.characterName}:${p.playerName}`} participant={p} areas={areas} onGuildClick={onGuildClick} leaderGuildName={effectiveLeaderGuild} />
        ))}
      </TableBody>
    </Table>
  )
}
