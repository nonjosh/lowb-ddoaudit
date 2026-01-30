import { useState, useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { Item } from '@/api/ddoGearPlanner'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  items: Item[]
  excludedPacks: string[]
  excludedAugments: string[]
  excludedItems: string[]
  onExcludedPacksChange: (packs: string[]) => void
  onExcludedAugmentsChange: (augments: string[]) => void
  onExcludedItemsChange: (items: string[]) => void
}

export default function IgnoreListDialog({
  open,
  onClose,
  items,
  excludedPacks,
  excludedAugments,
  excludedItems,
  onExcludedPacksChange,
  onExcludedAugmentsChange,
  onExcludedItemsChange
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState(0)

  // Extract unique adventure packs from items
  const availablePacks = useMemo(() => {
    const packs = new Set<string>()
    items.forEach(item => {
      if (item.quests) {
        item.quests.forEach(quest => packs.add(quest))
      }
    })
    return Array.from(packs).sort()
  }, [items])

  // Extract augment names (items with slot type "Augment")
  const availableAugments = useMemo(() => {
    return items
      .filter(item => item.slot === 'Augment' || item.type?.includes('Augment'))
      .map(item => item.name)
      .sort()
  }, [items])

  // All item names
  const availableItems = useMemo(() => {
    return items.map(item => item.name).sort()
  }, [items])

  const handleRemovePack = (pack: string) => {
    onExcludedPacksChange(excludedPacks.filter(p => p !== pack))
  }

  const handleRemoveAugment = (augment: string) => {
    onExcludedAugmentsChange(excludedAugments.filter(a => a !== augment))
  }

  const handleRemoveItem = (item: string) => {
    onExcludedItemsChange(excludedItems.filter(i => i !== item))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          <span>Ignore List</span>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Items, augments, and adventure packs in this list will be excluded from optimization results.
        </Typography>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab label={`Adventure Packs (${excludedPacks.length})`} />
          <Tab label={`Augments (${excludedAugments.length})`} />
          <Tab label={`Items (${excludedItems.length})`} />
        </Tabs>

        {/* Adventure Packs Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ignore all items from selected adventure packs
            </Typography>
            <Autocomplete
              multiple
              options={availablePacks}
              value={excludedPacks}
              onChange={(_, newValue) => onExcludedPacksChange(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Excluded Adventure Packs"
                  placeholder="Select packs to exclude..."
                />
              )}
              renderTags={(value, getTagProps) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                    />
                  ))}
                </Box>
              )}
            />
            {excludedPacks.length > 0 && (
              <List sx={{ mt: 2 }}>
                {excludedPacks.map(pack => (
                  <ListItem key={pack}>
                    <ListItemText primary={pack} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleRemovePack(pack)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Augments Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ignore specific augments from appearing in crafting slots
            </Typography>
            <Autocomplete
              options={availableAugments}
              value={null}
              onChange={(_, newValue) => {
                if (newValue && !excludedAugments.includes(newValue)) {
                  onExcludedAugmentsChange([...excludedAugments, newValue])
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add Augment to Exclude"
                  placeholder="Search augments..."
                />
              )}
            />
            {excludedAugments.length > 0 && (
              <List sx={{ mt: 2 }}>
                {excludedAugments.map(augment => (
                  <ListItem key={augment}>
                    <ListItemText primary={augment} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleRemoveAugment(augment)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Items Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ignore specific items from appearing in gear suggestions
            </Typography>
            <Autocomplete
              options={availableItems}
              value={null}
              onChange={(_, newValue) => {
                if (newValue && !excludedItems.includes(newValue)) {
                  onExcludedItemsChange([...excludedItems, newValue])
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add Item to Exclude"
                  placeholder="Search items..."
                />
              )}
            />
            {excludedItems.length > 0 && (
              <List sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
                {excludedItems.map(item => (
                  <ListItem key={item}>
                    <ListItemText primary={item} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleRemoveItem(item)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
