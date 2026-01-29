import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Item, SetsData } from '@/api/ddoGearPlanner'
import { formatAffix } from '@/utils/affixHelpers'
import { GearSetup } from '@/domains/gearPlanner/gearSetup'
import { ItemSelectionTable } from './ItemSelectionTable'

interface SetItemsDialogProps {
  open: boolean
  onClose: () => void
  setName: string
  allItems: Item[]
  currentSetup?: GearSetup
  setsData?: SetsData | null
  onSelectItem?: (item: Item) => void
}

/**
 * Dialog showing all items in a set with rich information
 */
export function SetItemsDialog({
  open,
  onClose,
  setName,
  allItems,
  currentSetup,
  setsData,
  onSelectItem
}: SetItemsDialogProps) {
  // Filter items that belong to this set
  const setItems = allItems.filter(item => item.sets?.includes(setName))

  // Count how many items from this set are equipped
  let equippedCount = 0
  if (currentSetup) {
    const setupItems = Object.values(currentSetup).filter((item): item is Item => item !== undefined)
    equippedCount = setupItems.filter(item => item.sets?.includes(setName)).length
  }

  // Get set bonus threshold (lowest threshold that grants bonuses)
  const setBonuses = setsData?.[setName] || []
  const minThreshold = setBonuses.length > 0 ? Math.min(...setBonuses.map(b => b.threshold)) : 0

  // Group items by slot type
  const itemsBySlot = new Map<string, Item[]>()
  setItems.forEach(item => {
    const slot = item.slot || 'Other'
    if (!itemsBySlot.has(slot)) {
      itemsBySlot.set(slot, [])
    }
    itemsBySlot.get(slot)!.push(item)
  })

  // Sort slots: Armor first, then accessories, then weapons, then others
  const slotOrder = ['Armor', 'Belt', 'Boots', 'Bracers', 'Cloak', 'Gloves', 'Goggles', 'Helm', 'Necklace', 'Ring', 'Trinket', 'Weapon', 'Offhand']
  const sortedSlots = Array.from(itemsBySlot.keys()).sort((a, b) => {
    const aIndex = slotOrder.indexOf(a)
    const bIndex = slotOrder.indexOf(b)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.localeCompare(b)
  })

  // Get current item for comparison (first equipped item from this set)
  const currentItem = currentSetup
    ? Object.values(currentSetup).find(item => item?.sets?.includes(setName))
    : undefined

  const handleSelect = (item: Item) => {
    if (onSelectItem) {
      onSelectItem(item)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {setName} Set {equippedCount > 0 && `(${equippedCount}/${minThreshold})`}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Set Bonuses Summary */}
        {setBonuses.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Set Bonuses
            </Typography>
            {setBonuses.map((bonus, idx) => (
              <Box key={idx} sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {bonus.threshold} Pieces:
                </Typography>
                {bonus.affixes.map((affix, i) => (
                  <Typography key={i} variant="body2" sx={{ ml: 2 }}>
                    {formatAffix(affix)}
                  </Typography>
                ))}
              </Box>
            ))}
          </Paper>
        )}

        {/* Reusable Item Selection Table - grouped by slot */}
        {sortedSlots.map(slot => {
          const slotItems = itemsBySlot.get(slot) || []
          return (
            <Box key={slot} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                {slot} ({slotItems.length})
              </Typography>
              <ItemSelectionTable
                items={slotItems}
                currentItem={currentItem}
                onSelect={handleSelect}
                sortByML={true}
              />
            </Box>
          )
        })}
      </DialogContent>
    </Dialog>
  )
}
