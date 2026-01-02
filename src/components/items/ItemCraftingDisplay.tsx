import { Box, Tooltip, Typography } from '@mui/material'

interface ItemCraftingDisplayProps {
  crafting: string[]
  getAugmentColor: (text: string) => string | undefined
  getCraftingOptions: (craft: string) => string[]
}

export default function ItemCraftingDisplay({ crafting, getAugmentColor, getCraftingOptions }: ItemCraftingDisplayProps) {
  return (
    <ul style={{ margin: 0, paddingLeft: 20 }}>
      {crafting?.map((craft, idx) => {
        const bgColor = getAugmentColor(craft)
        const options = getCraftingOptions(craft)
        const content = bgColor ? (
          <Box component="span" sx={{
            bgcolor: bgColor,
            color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
            px: 0.5,
            borderRadius: 0.5,
            fontSize: '0.75rem',
            display: 'inline-block',
            lineHeight: 1.2
          }}>
            {craft}
          </Box>
        ) : (
          <Typography variant="body2" color="info.main" sx={{ fontSize: '0.8125rem' }}>
            {craft}
          </Typography>
        )
        return (
          <li key={`craft-${idx}`}>
            {options.length > 0 ? (
              <Tooltip
                title={
                  <Box>
                    {options[0]?.endsWith(':') ? (
                      <>
                        <Typography variant="body2" fontWeight="bold">{options[0].slice(0, -1)}</Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {options.slice(1).map((name: string) => (
                            <li key={name} style={{ fontSize: '0.75rem' }}>
                              {name.slice(2)}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {options.map((name: string) => (
                          <li key={name} style={{ fontSize: '0.75rem' }}>
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Box>
                }
              >
                {content}
              </Tooltip>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}