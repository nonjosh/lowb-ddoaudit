import { Box, Tooltip, Typography } from '@mui/material'
import React from 'react'

interface SetItem {
  threshold: number
  affixes: unknown[]
}

interface ItemSetTooltipProps {
  setName: string
  setsData: Record<string, SetItem[]>
  formatAffix: (affix: unknown) => React.ReactNode
}

export default function ItemSetTooltip({ setName, setsData, formatAffix }: ItemSetTooltipProps) {
  return (
    <Tooltip
      title={
        <Box>
          {setsData && setsData[setName]?.map((setItem, idx: number) => (
            <Box key={idx} sx={{ mb: idx < setsData[setName].length - 1 ? 2 : 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {setItem.threshold} Piece{setItem.threshold > 1 ? 's' : ''} Equipped:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {setItem.affixes?.map((affix) => formatAffix(affix)).map((effect: React.ReactNode, i: number) => (
                  <li key={i} style={{ fontSize: '0.75rem' }}>
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
