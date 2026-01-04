import { Box, Tooltip, Typography } from '@mui/material'
import React from 'react'

interface ItemSetTooltipProps {
  setName: string
  setsData: any
  formatAffix: (affix: any) => React.ReactNode
}

export default function ItemSetTooltip({ setName, setsData, formatAffix }: ItemSetTooltipProps) {
  return (
    <Tooltip
      title={
        <Box>
          {setsData && (setsData as any)[setName]?.map((setItem: any, idx: number) => (
            <Box key={idx} sx={{ mb: idx < (setsData as any)[setName].length - 1 ? 2 : 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {setItem.threshold} Piece{setItem.threshold > 1 ? 's' : ''} Equipped:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {setItem.affixes?.map((affix: any) => formatAffix(affix)).map((effect: string) => (
                  <li key={effect} style={{ fontSize: '0.75rem' }}>
                    {effect}
                  </li>
                ))}
              </ul>
            </Box>
          ))}
        </Box>
      }
    >
      <Typography variant="body2" sx={{ fontSize: '0.8125rem', cursor: 'pointer', border: 1, borderColor: 'primary.main', px: 0.5, borderRadius: 0.5 }}>
        {setName}
      </Typography>
    </Tooltip>
  )
}
