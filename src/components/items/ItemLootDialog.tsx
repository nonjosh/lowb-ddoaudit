import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { getItemsForQuest, Item } from '@/utils/itemLootHelpers'
import ItemDetailsDialog from './ItemDetailsDialog'

interface ItemLootDialogProps {
  open: boolean
  onClose: () => void
  questName: string
}

export default function ItemLootDialog({ open, onClose, questName }: ItemLootDialogProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  
  const items = getItemsForQuest(questName)
  
  const handleItemClick = (item: Item) => {
    setSelectedItem(item)
  }
  
  const handleCloseItemDetails = () => {
    setSelectedItem(null)
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div">
              Loot from: {questName}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{ color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items found for this quest.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {items.length} item{items.length !== 1 ? 's' : ''} found
              </Typography>
              <List dense>
                {items.map((item) => {
                  // Create a stable key using only item properties (no index)
                  // Combine multiple properties to ensure uniqueness
                  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
                  return (
                    <ListItem
                      key={itemKey}
                      disablePadding
                      sx={{ mb: 0.5 }}
                    >
                    <ListItemButton
                      onClick={() => handleItemClick(item)}
                      sx={{
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" component="span">
                              {item.name}
                            </Typography>
                            <Chip size="small" label={`ML ${item.ml}`} variant="outlined" />
                            {item.slot && (
                              <Chip size="small" label={item.slot} color="primary" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          item.type ? (
                            <Typography variant="caption" color="text.secondary">
                              {item.type}
                            </Typography>
                          ) : null
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                )})}
              </List>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <ItemDetailsDialog
        open={!!selectedItem}
        onClose={handleCloseItemDetails}
        item={selectedItem}
      />
    </>
  )
}
