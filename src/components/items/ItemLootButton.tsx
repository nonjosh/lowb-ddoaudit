import { IconButton, Tooltip } from '@mui/material'
import { MouseEvent, useState } from 'react'
import { GiChest } from 'react-icons/gi'

import ItemLootDialog from './ItemLootDialog'

interface ItemLootButtonProps {
  questName: string
}

export default function ItemLootButton({ questName }: ItemLootButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleClick = (e: MouseEvent) => {
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
          sx={{
            ml: 0.25,
            width: 28,
            height: 28,
            p: 0,
            color: 'action.active',
            '& svg': {
              display: 'block',
            },
          }}
        >
          <GiChest size={18} />
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
