import { formatClasses, getPlayerDisplayName } from '../raidLogic'
import CharacterNamesWithClassTooltip from './CharacterNamesWithClassTooltip'
import { Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Box, CircularProgress, Skeleton } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export default function CharactersSection({ loading, hasFetched, charactersById, charactersByPlayer, isPlayerCollapsed, togglePlayerCollapsed }) {
  const onlineCharacters = Object.values(charactersById ?? {})
    .filter((c) => c?.is_online)
    .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')))

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ mb: 0 }}>Characters</Typography>
        {loading && <CircularProgress size={20} />}
      </Box>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Online:{' '}
        {onlineCharacters.length
          ? onlineCharacters
              .map((c) => {
                const classes = formatClasses(c?.classes)
                return `${c?.name ?? 'Unknown'} (${classes})`
              })
              .join(', ')
          : '—'}
      </Typography>

      {Object.keys(charactersById ?? {}).length ? (
        <Box sx={{ mt: 2 }}>
          {charactersByPlayer.map((group) => {
            const collapsed = isPlayerCollapsed(group.player)
            const onlineForPlayer = (group.chars ?? [])
              .filter((c) => c?.is_online)
              .slice()
              .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')))

            const onlineForPlayerItems = onlineForPlayer.map((c) => ({
              id: c?.id,
              name: c?.name,
              classes: c?.classes,
            }))

            return (
              <Accordion 
                key={group.player} 
                expanded={!collapsed} 
                onChange={() => togglePlayerCollapsed(group.player)}
                disableGutters
                elevation={0}
                sx={{ 
                  '&:before': { display: 'none' },
                  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'transparent'
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {getPlayerDisplayName(group.player)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({group.chars.length})
                    </Typography>
                    {collapsed && onlineForPlayer.length ? (
                      <Box component="span" sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption">🟢</Typography>
                        <CharacterNamesWithClassTooltip items={onlineForPlayerItems} />
                      </Box>
                    ) : null}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {group.chars.map((c) => (
                      <Chip
                        key={c.id}
                        label={
                          <span>
                            <strong>{c.name}</strong>
                            {c.is_online ? ' 🟢' : null}
                            <span style={{ opacity: 0.7, marginLeft: 4 }}>({formatClasses(c?.classes)})</span>
                          </span>
                        }
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Box>
      ) : (loading || !hasFetched) ? (
        <Box sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No character data found.
        </Typography>
      )}
    </>
  )
}
