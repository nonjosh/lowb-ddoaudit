import { SxProps, Theme } from '@mui/material'

export const artifactBorderLabelSx: SxProps<Theme> = {
  borderStyle: 'solid',
  borderColor: 'warning.main',
  borderWidth: 2,
  overflow: 'visible',
  position: 'relative',
  '&::before': {
    content: '"artifact"',
    position: 'absolute',
    top: 0,
    left: 12,
    transform: 'translateY(-50%)',
    px: 0.75,
    py: 0.125,
    bgcolor: 'background.paper',
    color: 'warning.main',
    fontSize: '0.7rem',
    fontWeight: 700,
    lineHeight: 1,
    textTransform: 'uppercase'
  }
}

export const artifactTableRowSx: SxProps<Theme> = {
  '& > td': {
    borderTop: '2px solid',
    borderBottom: '2px solid',
    borderColor: 'warning.main'
  },
  '& > td:first-of-type': {
    borderLeft: '2px solid',
    borderColor: 'warning.main',
    overflow: 'visible',
    position: 'relative',
    '&::before': {
      content: '"artifact"',
      position: 'absolute',
      top: 2,
      left: 12,
      transform: 'none',
      px: 0.75,
      py: 0.125,
      bgcolor: 'background.paper',
      color: 'warning.main',
      fontSize: '0.7rem',
      fontWeight: 700,
      lineHeight: 1,
      textTransform: 'uppercase'
    }
  },
  '& > td:last-of-type': {
    borderRight: '2px solid',
    borderColor: 'warning.main'
  }
}