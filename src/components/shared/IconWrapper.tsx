import { Box, SxProps, Theme } from '@mui/material'
import { ReactNode } from 'react'

interface IconWrapperProps {
  children: ReactNode
  size?: number | string
  color?: string
  sx?: SxProps<Theme>
}

export default function IconWrapper({ children, size = 28, color, sx }: IconWrapperProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        '& svg': {
          fontSize: typeof size === 'number' ? Math.floor(size * 0.7) : '1.25rem',
          display: 'block',
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
