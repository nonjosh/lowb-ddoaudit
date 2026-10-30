import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import { IconButton, Stack, Tooltip, Typography } from '@mui/material'

import { formatLocalDateTime } from '@/api/ddoAudit/helpers'
import { CharacterRemark, remarkKey } from '@/api/remarks'
import { useRemarks } from '@/contexts/useRemarks'

import { VERDICT_COLOR, VERDICT_ICON } from './verdicts'

interface RemarkBadgeProps {
  characterName: string
  /** DDO Audit id when the caller has it; the name lookup is the fallback. */
  characterId?: string | null
  iconSize?: number
}

/**
 * Verdict icon (and an "alt" icon when the note covers several characters) next to a
 * character name. Clicking it opens that character's note.
 */
export default function RemarkBadge({ characterName, characterId, iconSize = 16 }: RemarkBadgeProps) {
  const { getNote, openFindCharacter } = useRemarks()
  const note: CharacterRemark | undefined = getNote(characterName, characterId)
  if (!note) return null

  const Icon = VERDICT_ICON[note.verdict]

  return (
    <Stack component="span" direction="row" spacing={0.25} alignItems="center" sx={{ display: 'inline-flex' }}>
      <Tooltip
        arrow
        title={
          <Stack spacing={0.5}>
            <Typography variant="body2">{note.note || 'No note text'}</Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
              {formatLocalDateTime(note.updatedAt)}
            </Typography>
          </Stack>
        }
      >
        <IconButton
          size="small"
          aria-label={`Note for ${characterName}`}
          onClick={(event) => {
            event.stopPropagation()
            openFindCharacter(characterName, characterId ?? undefined)
          }}
          sx={{ p: 0.25 }}
        >
          <Icon color={VERDICT_COLOR[note.verdict]} sx={{ fontSize: iconSize }} />
        </IconButton>
      </Tooltip>
      {note.smurfs.length > 1 ? (
        <Tooltip
          title={`Same player as ${note.smurfs
            .filter((smurf) =>
              characterId ? smurf.id !== characterId : remarkKey(smurf.name) !== remarkKey(characterName),
            )
            .map((smurf) => smurf.name)
            .join(', ')}`}
        >
          <PeopleAltIcon color="action" sx={{ fontSize: iconSize - 2 }} />
        </Tooltip>
      ) : null}
    </Stack>
  )
}
