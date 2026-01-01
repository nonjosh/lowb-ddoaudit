import BackpackIcon from '@mui/icons-material/Backpack'
import { IconButton, Tooltip } from '@mui/material'
import { useState } from 'react'
import ItemLootDialog from './ItemLootDialog'

interface ItemLootButtonProps {
  questName: string
}

export default function ItemLootButton({ questName }: ItemLootButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
  }

  return (
    <>
      <Tooltip title="View quest loot">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ ml: 0.5 }}
        >
          <BackpackIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      
      <ItemLootDialog
        open={dialogOpen}
        onClose={handleClose}
        questName={questName}
      />
    </>
  )
}
