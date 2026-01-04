import { Chip, Stack, TableCell, TableRow, Typography } from '@mui/material'

import ClassDisplay from '@/components/shared/ClassDisplay'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { useConfig } from '@/contexts/ConfigContext'

import { LfmParticipant } from './types'

interface LfmParticipantRowProps {
  participant: LfmParticipant
  areas: Record<string, { name: string }>
}

export default function LfmParticipantRow({ participant, areas }: LfmParticipantRowProps) {
  const { showClassIcons } = useConfig()
  return (
    <TableRow>
      <TableCell>
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" noWrap>
              {participant.characterName}
            </Typography>
            {EXPECTED_PLAYERS.includes(participant.playerName) ? (
              <Chip size="small" color="success" label={participant.playerDisplayName} />
            ) : null}
            {participant.isLeader ? <Chip size="small" variant="outlined" label="Leader" /> : null}
          </Stack>
          {participant.guildName ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {participant.guildName}
            </Typography>
          ) : null}
        </Stack>
      </TableCell>
      <TableCell align="right">{typeof participant.totalLevel === 'number' ? participant.totalLevel : '—'}</TableCell>
      <TableCell>
        <ClassDisplay classes={participant.classes ?? []} showIcons={showClassIcons} />
      </TableCell>
      <TableCell>{participant.race}</TableCell>
      <TableCell>{areas[String(participant.location_id)]?.name || 'Unknown'}</TableCell>
    </TableRow>
  )
}
