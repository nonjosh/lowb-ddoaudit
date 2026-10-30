import { Chip, Stack, TableCell, TableRow, Typography } from '@mui/material'

import RemarkBadge from '@/components/remarks/RemarkBadge'
import ClassDisplay from '@/components/shared/ClassDisplay'
import { EXPECTED_PLAYERS } from '@/config/characters'
import { useConfig } from '@/contexts/useConfig'
import { useRemarks } from '@/contexts/useRemarks'
import { LfmParticipant } from '@/domains/lfm/lfmHelpers'

interface LfmParticipantRowProps {
  participant: LfmParticipant
  areas: Record<string, { name: string }>
  onGuildClick?: (guildName: string) => void
  leaderGuildName?: string
}

export default function LfmParticipantRow({ participant, areas, onGuildClick, leaderGuildName }: LfmParticipantRowProps) {
  const { showClassIcons } = useConfig()
  const { openFindCharacter } = useRemarks()
  // An anonymous character has no name, so there is nothing to look up.
  const named = Boolean(participant.characterName)

  return (
    <TableRow>
      <TableCell>
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              component={named ? 'button' : 'span'}
              type={named ? 'button' : undefined}
              variant="body2"
              noWrap
              onClick={named ? () => openFindCharacter(participant.characterName, participant.characterId) : undefined}
              sx={
                named
                  ? {
                      border: 0,
                      bgcolor: 'transparent',
                      p: 0,
                      font: 'inherit',
                      color: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                      '&:hover': { textDecoration: 'underline' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                    }
                  : undefined
              }
            >
              {participant.characterDisplayName}
            </Typography>
            <RemarkBadge characterName={participant.characterName} characterId={participant.characterId} />
            {EXPECTED_PLAYERS.includes(participant.playerName) ? (
              <Chip size="small" color="success" label={participant.playerDisplayName} />
            ) : null}
            {participant.isLeader ? <Chip size="small" variant="outlined" label="Leader" /> : null}
          </Stack>
          {participant.guildName ? (
            <Typography
              variant="caption"
              noWrap
              sx={{
                cursor: onGuildClick ? 'pointer' : 'default',
                '&:hover': onGuildClick ? { textDecoration: 'underline' } : undefined,
                ...(leaderGuildName && participant.guildName === leaderGuildName
                  ? { color: 'primary.main', fontWeight: 600 }
                  : { color: 'text.secondary' }),
              }}
              onClick={(e) => {
                if (onGuildClick && participant.guildName) {
                  e.stopPropagation()
                  onGuildClick(participant.guildName)
                }
              }}
            >
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
