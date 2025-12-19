import { memo } from 'react'
import { Box, Tooltip, Typography } from '@mui/material'
import { CharacterClass, formatClasses } from '../raidLogic'

interface ClassDisplayProps {
  classes: CharacterClass[]
  showIcons: boolean
  hideLevels?: boolean
}

function ClassDisplay({ classes, showIcons, hideLevels = false }: ClassDisplayProps) {
  if (!showIcons) {
    return <Typography variant="body2" component="span">{formatClasses(classes)}</Typography>
  }

  const list = Array.isArray(classes) ? classes : []
  const filtered = list.filter((c) => c?.name && c?.name !== 'Epic' && c?.name !== 'Legendary')

  if (!filtered.length) {
    return <Typography variant="body2" component="span">—</Typography>
  }

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', verticalAlign: 'middle' }}>
      {filtered.map((c, idx) => (
        <Tooltip key={idx} title={`${c.name} ${c.level}`}>
          <Box component="span" sx={{ position: 'relative', display: 'inline-flex', width: 24, height: 24 }}>
            <Box
              component="img"
              src={`/class-icons/${c.name.toLowerCase().replace(/\s+/g, '-')}.png`}
              alt={c.name}
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            {!hideLevels && (
              <Typography
                variant="caption"
                component="span"
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#fff',
                  textShadow: '0 0 3px #000, 0 0 3px #000, 0 0 3px #000',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {c.level}
              </Typography>
            )}
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}

export default memo(ClassDisplay)
