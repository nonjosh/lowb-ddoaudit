import { useState } from 'react'

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import BlockIcon from '@mui/icons-material/Block'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import LaunchIcon from '@mui/icons-material/Launch'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import {
  Box,
  Card,
  CardContent,
  Collapse,
  Grid,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'

import { Item, ItemAffix, SetsData } from '@/api/ddoGearPlanner'
import { useWishlist } from '@/contexts/useWishlist'
import {
  GearCraftingSelections,
  GearSetup,
  getCraftingSetMemberships
} from '@/domains/gearPlanner'
import { generateCraftingOptionName } from '@/domains/gearPlanner/augmentHelpers'
import { formatAffix, getWikiUrl } from '@/utils/affixHelpers'

import InventoryBadge from './InventoryBadge'
import ItemSelectionDialog from './ItemSelectionDialog'
import { SetItemsDialog } from './SetItemsDialog'

// Type for hovering on a specific bonus source (property + bonus type cell)
interface HoveredBonusSource {
  property: string
  bonusType: string
  augmentNames?: string[]
}

interface GearDisplayProps {
  setup: GearSetup
  selectedProperties: string[]
  hoveredProperty?: string | null
  hoveredAugment?: string | null
  hoveredSetAugment?: string | null
  hoveredBonusSource?: HoveredBonusSource | null
  hoveredSetName?: string | null
  onAugmentHover?: (augmentName: string | null) => void
  onSetAugmentHover?: (setName: string | null) => void
  onSetNameHover?: (setName: string | null) => void
  craftingSelections?: GearCraftingSelections
  setsData?: SetsData | null
  onGearChange?: (slot: string, item: Item | undefined) => void
  availableItems?: Item[]
  onPropertyAdd?: (property: string) => void
  pinnedSlots?: Set<string>
  onTogglePin?: (slot: string, currentSetup: GearSetup) => void
  excludedItems?: string[]
  onToggleItemIgnore?: (itemName: string) => void
  excludedAugments?: string[]
  onExcludedAugmentsChange?: (augments: string[]) => void
}

const slotDisplayNames: Record<string, string> = {
  armor: 'Armor',
  belt: 'Belt',
  boots: 'Boots',
  bracers: 'Bracers',
  cloak: 'Cloak',
  gloves: 'Gloves',
  goggles: 'Goggles',
  helm: 'Helm',
  necklace: 'Necklace',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  trinket: 'Trinket'
}

function getItemForSlot(setup: GearSetup, slot: string): Item | undefined {
  return setup[slot as keyof GearSetup]
}

// Get augment color based on augment slot name (reuse from ItemWiki)
function getAugmentColor(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (lower.includes('blue augment slot')) return '#2196f3'
  if (lower.includes('red augment slot')) return '#f44336'
  if (lower.includes('yellow augment slot')) return '#ffeb3b'
  if (lower.includes('green augment slot')) return '#4caf50'
  if (lower.includes('purple augment slot')) return '#9c27b0'
  if (lower.includes('orange augment slot')) return '#ff9800'
  if (lower.includes('colorless augment slot')) return '#e0e0e0'
  return undefined
}

// Convert augment name to ddowiki URL format
function getAugmentWikiUrl(augmentName: string): string {
  // Replace spaces with underscores for ddowiki URL format
  const formattedName = augmentName.replace(/\s+/g, '_')
  return `https://ddowiki.com/page/Item:${formattedName}`
}

// Crafting slot type priority for sorting
// blue/yellow/red => green/purple/orange => colorless => moon/sun => others
function getCraftingSlotPriority(slotType: string): number {
  const lower = slotType.toLowerCase()
  if (lower.includes('blue augment')) return 1
  if (lower.includes('yellow augment')) return 2
  if (lower.includes('red augment')) return 3
  if (lower.includes('green augment')) return 4
  if (lower.includes('purple augment')) return 5
  if (lower.includes('orange augment')) return 6
  if (lower.includes('colorless augment')) return 7
  if (lower.includes('moon augment')) return 8
  if (lower.includes('sun augment')) return 9
  return 100 // others
}

// Check if this property has the highest bonus of its type across all gear
function isHighestBonus(
  item: Item,
  affix: ItemAffix,
  setup: GearSetup,
  slots: string[]
): boolean {
  if (affix.type === 'bool') return false

  const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
  if (isNaN(value)) return false

  // Check all other items for the same property and type
  let maxValue = value
  for (const slot of slots) {
    const otherItem = getItemForSlot(setup, slot)
    if (!otherItem || otherItem === item) continue

    for (const otherAffix of otherItem.affixes) {
      if (otherAffix.name === affix.name && otherAffix.type === affix.type) {
        const otherValue = typeof otherAffix.value === 'string' ? parseFloat(otherAffix.value) : otherAffix.value
        if (!isNaN(otherValue) && otherValue > maxValue) {
          return false
        }
      }
    }
  }

  return true
}

function GearSlotCard({
  slotName,
  item,
  selectedProperties,
  setup,
  slots,
  hoveredProperty,
  hoveredBonusSource,
  hoveredSetName,
  slottedAugmentNames,
  onGearChange,
  onSetNameHover,
  availableItems,
  onPropertyAdd,
  isPinned,
  onTogglePin,
  isIgnored,
  onToggleIgnore
}: {
  slotName: string
  item: Item | undefined
  selectedProperties: string[]
  setup: GearSetup
  slots: string[]
  hoveredProperty?: string | null
  hoveredBonusSource?: HoveredBonusSource | null
  hoveredSetName?: string | null
  slottedAugmentNames?: string[]
  onGearChange?: (item: Item | undefined) => void
  onSetNameHover?: (setName: string | null) => void
  availableItems?: Item[]
  onPropertyAdd?: (property: string) => void
  isPinned?: boolean
  onTogglePin?: () => void
  isIgnored?: boolean
  onToggleIgnore?: () => void
}) {
  const { isWished, toggleWish } = useWishlist()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!item) {
    return (
      <>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {slotName}
              </Typography>
              {onTogglePin && (
                <Tooltip title={isPinned ? "Unpin slot" : "Pin slot (empty)"}>
                  <IconButton
                    size="small"
                    onClick={onTogglePin}
                    sx={{ mt: -0.5, mr: -0.5 }}
                  >
                    {isPinned ? (
                      <PushPinIcon fontSize="small" color="primary" />
                    ) : (
                      <PushPinOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Not equipped
            </Typography>
            {onGearChange && availableItems && availableItems.length > 0 && (
              <Tooltip title="Select item">
                <IconButton
                  size="small"
                  onClick={() => setDialogOpen(true)}
                  sx={{ mt: 0.5 }}
                >
                  <SwapHorizIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </CardContent>
        </Card>
        {onGearChange && availableItems && (
          <ItemSelectionDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            items={availableItems}
            slotName={slotName}
            onSelect={(item) => onGearChange(item)}
          />
        )}
      </>
    )
  }

  const wished = isWished(item)

  // Get all affixes - regular affixes only (not augment slots, those are in crafting array)
  const regularAffixes = item.affixes

  // Get all crafting slots from crafting array
  const craftingSlots = item.crafting || []

  // Check if this item has the hovered property
  const hasHoveredProperty = hoveredProperty && regularAffixes.some(a => a.name === hoveredProperty)

  // Check if this item has an affix that matches the hovered bonus source
  const hasHoveredBonusSource = hoveredBonusSource && regularAffixes.some(
    a => a.name === hoveredBonusSource.property && (a.type || 'Untyped') === hoveredBonusSource.bonusType
  )

  // Check if this item has augments that are highlighted from hoveredBonusSource.augmentNames
  const hasHighlightedAugment = hoveredBonusSource?.augmentNames?.some(
    augName => slottedAugmentNames?.includes(augName)
  )

  // Check if this item is part of the hovered set
  const isPartOfHoveredSet = hoveredSetName && item.sets?.includes(hoveredSetName)

  // Combine highlighting conditions
  const isHighlighted = hasHoveredProperty || hasHoveredBonusSource || hasHighlightedAugment || isPartOfHoveredSet

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          boxShadow: isHighlighted ? 3 : (item.artifact ? 2 : 0),
          borderColor: item.artifact ? 'warning.main' : (isHighlighted ? 'primary.main' : 'divider'),
          borderWidth: item.artifact || isHighlighted ? 2 : 1,
          transition: 'all 0.2s',
          ...(item.artifact && {
            boxShadow: '0 0 8px rgba(255, 152, 0, 0.3)'
          })
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              {slotName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: -0.5, mr: -0.5 }}>
              <InventoryBadge itemName={item.name} showBTC />
              {onTogglePin && (
                <Tooltip title={isPinned ? "Unpin item" : "Pin item to slot"}>
                  <IconButton
                    size="small"
                    onClick={onTogglePin}
                    color={isPinned ? "primary" : "default"}
                  >
                    {isPinned ? (
                      <PushPinIcon fontSize="small" />
                    ) : (
                      <PushPinOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={wished ? "Remove from wishlist" : "Add to wishlist"}>
                <IconButton
                  size="small"
                  onClick={() => toggleWish(item)}
                >
                  {wished ? (
                    <FavoriteIcon fontSize="small" color="error" />
                  ) : (
                    <FavoriteBorderIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              {onToggleIgnore && (
                <Tooltip title={isIgnored ? "Remove from ignore list" : "Ignore this item"}>
                  <IconButton
                    size="small"
                    onClick={onToggleIgnore}
                    color={isIgnored ? "warning" : "default"}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getWikiUrl(item.url) ? (
              <Link
                href={getWikiUrl(item.url)!}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'text.primary',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main'
                  }
                }}
              >
                <Typography variant="body2" fontWeight="bold" component="span">
                  {item.name}
                </Typography>
              </Link>
            ) : (
              <Typography variant="body2" fontWeight="bold" component="span">
                {item.name}
              </Typography>
            )}
            {onGearChange && availableItems && availableItems.length > 0 && (
              <Tooltip title="Change item">
                <IconButton
                  size="small"
                  onClick={() => setDialogOpen(true)}
                  sx={{ p: 0.25, ml: 0.5 }}
                >
                  <SwapHorizIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="caption" color="text.secondary">
              ML {item.ml}
            </Typography>
            {item.quests && item.quests.length > 0 && (
              <Link
                href={`https://ddowiki.com/page/${item.quests[0].replace(/\s+/g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main'
                  }
                }}
              >
                {item.quests[0]}
              </Link>
            )}
          </Box>

          {/* Set Membership Badges */}
          {item.sets && item.sets.length > 0 && onGearChange && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {item.sets.map((setName, idx) => (
                <Tooltip key={idx} title={`Part of ${setName} set`}>
                  <Box
                    component="span"
                    onMouseEnter={() => onSetNameHover?.(setName)}
                    onMouseLeave={() => onSetNameHover?.(null)}
                    sx={{
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontSize: '0.65rem',
                      display: 'inline-block',
                      lineHeight: 1.2,
                      cursor: 'help',
                      '&:hover': { opacity: 0.8 }
                    }}
                  >
                    Set: {setName}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          )}

          {/* All Properties */}
          <Box sx={{ mt: 1 }}>
            {regularAffixes.map((affix, idx) => {
              const isHighest = selectedProperties.includes(affix.name) && isHighestBonus(item, affix, setup, slots)
              const isSelected = selectedProperties.includes(affix.name)
              const isHovered = hoveredProperty === affix.name

              // Check if this affix matches the hovered bonus source
              const isBonusSourceHovered = hoveredBonusSource &&
                affix.name === hoveredBonusSource.property &&
                (affix.type || 'Untyped') === hoveredBonusSource.bonusType

              const shouldHighlight = isHovered || isBonusSourceHovered

              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{
                      flex: 1,
                      fontWeight: isHighest ? 'bold' : 'normal',
                      color: isHighest ? 'primary.main' : (isSelected ? 'text.primary' : 'text.secondary'),
                      backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                      px: shouldHighlight ? 0.5 : 0,
                      borderRadius: shouldHighlight ? 0.5 : 0,
                      transition: 'all 0.2s'
                    }}
                  >
                    {formatAffix(affix)}
                  </Typography>
                  {!isSelected && onPropertyAdd && affix.type !== 'bool' && (
                    <Tooltip title="Add to selected properties">
                      <IconButton
                        size="small"
                        onClick={() => onPropertyAdd(affix.name)}
                        sx={{
                          p: 0.25,
                          opacity: 0.6,
                          '&:hover': { opacity: 1 }
                        }}
                      >
                        <AddCircleOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )
            })}
          </Box>

          {/* Crafting Slots - show all crafting options */}
          {craftingSlots.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {craftingSlots.map((craftingSlot, idx) => {
                const bgColor = getAugmentColor(craftingSlot)
                return (
                  <Box key={idx} sx={{ mb: 0.25 }}>
                    <Box
                      component="span"
                      sx={{
                        bgcolor: bgColor || 'grey.700',
                        color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '0.75rem',
                        display: 'inline-block',
                        lineHeight: 1.2
                      }}
                    >
                      {craftingSlot}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </CardContent>
      </Card>
      {/* Item Selection Dialog */}
      {onGearChange && availableItems && (
        <ItemSelectionDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          items={availableItems}
          currentItem={item}
          slotName={slotName}
          onSelect={(newItem) => onGearChange(newItem)}
        />
      )}
    </>
  )
}

export default function GearDisplay({
  setup,
  selectedProperties,
  hoveredProperty,
  hoveredAugment,
  hoveredSetAugment,
  hoveredBonusSource,
  hoveredSetName,
  onAugmentHover,
  onSetAugmentHover,
  onSetNameHover,
  craftingSelections,
  setsData,
  onGearChange,
  availableItems,
  onPropertyAdd,
  pinnedSlots,
  onTogglePin,
  excludedItems = [],
  onToggleItemIgnore,
  excludedAugments = [],
  onExcludedAugmentsChange
}: GearDisplayProps) {
  const [craftingExpanded, setCraftingExpanded] = useState(false)
  const [setDialogOpen, setSetDialogOpen] = useState(false)
  const [selectedSetName, setSelectedSetName] = useState<string>('')
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Show all slots, not just equipped ones
  const allSlots = slots

  // Build a map of slot -> slotted augment names for highlighting
  const slotToAugmentNames = new Map<string, string[]>()
  allSlots.forEach(slot => {
    const selections = craftingSelections?.[slot]
    if (selections) {
      const augmentNames = selections
        .filter(s => s.option?.name)
        .map(s => s.option!.name!)
      slotToAugmentNames.set(slot, augmentNames)
    }
  })

  // Collect all crafting selections grouped by slot type (including non-augments)
  // Track both total slots per type and slotted options
  const craftingSlotsByType = new Map<string, { total: number; slotted: { name: string; affixes: ItemAffix[]; set?: string; slot: string }[] }>()
  let totalCraftingSlots = 0
  let usedCraftingSlots = 0

  allSlots.forEach(slot => {
    const item = getItemForSlot(setup, slot)
    if (item && item.crafting) {
      const selections = craftingSelections?.[slot]

      item.crafting.forEach((craftingSlotType, idx) => {
        totalCraftingSlots++

        // Initialize slot type tracking if needed
        if (!craftingSlotsByType.has(craftingSlotType)) {
          craftingSlotsByType.set(craftingSlotType, { total: 0, slotted: [] })
        }
        const slotTypeData = craftingSlotsByType.get(craftingSlotType)!
        slotTypeData.total++

        const selection = selections?.[idx]
        if (selection?.option) {
          // Check if this option contributes to selected properties
          const contributesToSelected = selection.option.affixes?.some(affix =>
            affix.type !== 'bool' && selectedProperties.includes(affix.name)
          )
          if (contributesToSelected) {
            usedCraftingSlots++
          }

          // Add to slotted list with slot info
          slotTypeData.slotted.push({
            name: generateCraftingOptionName(selection.option),
            affixes: selection.option.affixes || [],
            set: selection.option.set,
            slot
          })
        }
      })
    }
  })

  // Group slotted items by name and count occurrences
  const groupSlottedByName = (slotted: { name: string; affixes: ItemAffix[]; set?: string; slot: string }[]) => {
    const grouped = new Map<string, { count: number; affixes: ItemAffix[]; set?: string; slots: string[] }>()
    for (const item of slotted) {
      if (grouped.has(item.name)) {
        const data = grouped.get(item.name)!
        data.count++
        data.slots.push(item.slot)
      } else {
        grouped.set(item.name, { count: 1, affixes: item.affixes, set: item.set, slots: [item.slot] })
      }
    }
    return Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      affixes: data.affixes,
      set: data.set,
      slots: data.slots
    }))
  }

  // Sort crafting slot types by priority (blue/yellow/red first, then green/purple/orange, then colorless, then others)
  const sortedCraftingTypes = Array.from(craftingSlotsByType.entries()).sort((a, b) => {
    const priorityA = getCraftingSlotPriority(a[0])
    const priorityB = getCraftingSlotPriority(b[0])
    if (priorityA !== priorityB) return priorityA - priorityB
    return a[0].localeCompare(b[0]) // alphabetical within same priority
  })

  // Calculate all set bonuses (active and inactive)
  interface SetBonusInfo {
    setName: string
    count: number
    bonuses: Array<{
      threshold: number
      affixes: ItemAffix[]
      isActive: boolean
    }>
  }
  const allSetBonuses: SetBonusInfo[] = []

  if (setsData) {
    // Count set pieces from items
    const setItemCounts = new Map<string, number>()
    allSlots.forEach(slot => {
      const item = getItemForSlot(setup, slot)
      if (item?.sets) {
        for (const setName of item.sets) {
          setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1)
        }
      }
    })

    // Add set memberships from crafting (Set Augments)
    if (craftingSelections) {
      for (const slot of allSlots) {
        const selections = craftingSelections[slot] || []
        const setMemberships = getCraftingSetMemberships(selections)
        for (const setName of setMemberships) {
          setItemCounts.set(setName, (setItemCounts.get(setName) || 0) + 1)
        }
      }
    }

    // Build set bonus info for all sets
    for (const [setName, count] of setItemCounts.entries()) {
      const setBonuses = setsData[setName]
      if (setBonuses) {
        const bonusesInfo = setBonuses.map(bonus => ({
          threshold: bonus.threshold,
          affixes: bonus.affixes,
          isActive: count >= bonus.threshold
        }))

        allSetBonuses.push({
          setName,
          count,
          bonuses: bonusesInfo
        })
      }
    }
  }

  // Count how many sets have active bonuses
  const activeSetCount = allSetBonuses.filter(setInfo =>
    setInfo.bonuses.some(bonus => bonus.isActive)
  ).length

  // Default collapse if no active sets
  const [setsExpanded, setSetsExpanded] = useState(activeSetCount > 0)

  // Count minor artifacts in setup
  const minorArtifactCount = allSlots.filter(slot => {
    const item = getItemForSlot(setup, slot)
    return item?.artifact === true
  }).length

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Selected Gear Setup
      </Typography>

      {/* Minor Artifact Warning */}
      {minorArtifactCount > 1 && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            ⚠️ Warning: {minorArtifactCount} Minor Artifacts Equipped
          </Typography>
          <Typography variant="body2">
            — Only 1 minor artifact can be worn at a time. This setup is invalid.
          </Typography>
        </Box>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {allSlots.map(slot => {
          // Get available items for this slot (filtered by slot type)
          const slotAvailableItems = availableItems?.filter(item => {
            if (slot === 'ring1' || slot === 'ring2') {
              return item.slot === 'Ring'
            }
            return item.slot === slotDisplayNames[slot]
          })

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={slot}>
              <GearSlotCard
                slotName={slotDisplayNames[slot]}
                item={getItemForSlot(setup, slot)}
                selectedProperties={selectedProperties}
                setup={setup}
                slots={slots}
                hoveredProperty={hoveredProperty}
                hoveredBonusSource={hoveredBonusSource}
                hoveredSetName={hoveredSetName}
                slottedAugmentNames={slotToAugmentNames.get(slot)}
                onGearChange={onGearChange ? (item) => onGearChange(slot, item) : undefined}
                onSetNameHover={onSetNameHover}
                availableItems={slotAvailableItems}
                onPropertyAdd={onPropertyAdd}
                isPinned={pinnedSlots?.has(slot)}
                onTogglePin={onTogglePin ? () => onTogglePin(slot, setup) : undefined}
                isIgnored={getItemForSlot(setup, slot) ? excludedItems.includes(getItemForSlot(setup, slot)!.name) : false}
                onToggleIgnore={onToggleItemIgnore && getItemForSlot(setup, slot) ? () => onToggleItemIgnore(getItemForSlot(setup, slot)!.name) : undefined}
              />
            </Grid>
          )
        })}
      </Grid>

      {/* Set Bonuses Section */}
      {allSetBonuses.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent sx={{ pb: setsExpanded ? 2 : '8px !important' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setSetsExpanded(!setsExpanded)}
            >
              <Typography variant="subtitle1">
                Set Bonuses ({activeSetCount} active)
              </Typography>
              <IconButton size="small">
                {setsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={setsExpanded}>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Set Name</TableCell>
                      <TableCell>Threshold</TableCell>
                      <TableCell>Bonuses</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allSetBonuses.flatMap((setInfo) =>
                      setInfo.bonuses.map((bonus, idx) => (
                        <TableRow
                          key={`${setInfo.setName}-${bonus.threshold}-${idx}`}
                          sx={{
                            opacity: bonus.isActive ? 1 : 0.5,
                            backgroundColor: bonus.isActive ? 'inherit' : 'action.hover'
                          }}
                        >
                          <TableCell
                            onMouseEnter={() => onSetNameHover?.(setInfo.setName)}
                            onMouseLeave={() => onSetNameHover?.(null)}
                            onClick={() => {
                              setSelectedSetName(setInfo.setName)
                              setSetDialogOpen(true)
                            }}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'action.hover', textDecoration: 'underline' }
                            }}
                          >
                            <Tooltip title={bonus.isActive ? 'Click to view set items' : `Need ${bonus.threshold - setInfo.count} more pieces. Click to view set items.`}>
                              <span>{setInfo.setName}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {setInfo.count}/{bonus.threshold} {bonus.isActive ? '✓' : ''}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {bonus.affixes.map((affix, i) => {
                                const isSelected = selectedProperties.includes(affix.name)
                                return (
                                  <Box
                                    key={i}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        flex: 1,
                                        color: bonus.isActive && isSelected ? 'success.main' : 'text.secondary',
                                        fontWeight: bonus.isActive && isSelected ? 'bold' : 'normal'
                                      }}
                                    >
                                      {formatAffix(affix)}
                                    </Typography>
                                    {!isSelected && onPropertyAdd && affix.type !== 'bool' && (
                                      <Tooltip title="Add to selected properties">
                                        <IconButton
                                          size="small"
                                          onClick={() => onPropertyAdd(affix.name)}
                                          sx={{
                                            p: 0.25,
                                            opacity: 0.6,
                                            '&:hover': { opacity: 1 }
                                          }}
                                        >
                                          <AddCircleOutlineIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                )
                              })}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Crafting Slots Summary Table */}
      {sortedCraftingTypes.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent sx={{ pb: craftingExpanded ? 2 : '8px !important' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setCraftingExpanded(!craftingExpanded)}
            >
              <Typography variant="subtitle1">
                Slotted Crafting Options ({usedCraftingSlots}/{totalCraftingSlots} slots used)
              </Typography>
              <IconButton size="small">
                {craftingExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={craftingExpanded}>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Slot Type</TableCell>
                      <TableCell>Slotted Options</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedCraftingTypes.map(([slotType, data]) => {
                      const groupedSlotted = groupSlottedByName(data.slotted)
                      const bgColor = getAugmentColor(slotType)

                      return (
                        <TableRow key={slotType}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                component="span"
                                sx={{
                                  bgcolor: bgColor || 'grey.700',
                                  color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
                                  px: 0.5,
                                  py: 0.25,
                                  borderRadius: 0.5,
                                  fontSize: '0.75rem',
                                  display: 'inline-block',
                                  lineHeight: 1.2
                                }}
                              >
                                {slotType}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                ({data.slotted.length}/{data.total})
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {groupedSlotted.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {groupedSlotted.map((aug, idx) => {
                                  // Check if this augment should be highlighted
                                  const isAugmentHovered = hoveredAugment === aug.name
                                  const isSetAugmentHovered = aug.set && hoveredSetAugment === aug.set
                                  const isHighlightedFromBonusSource = hoveredBonusSource?.augmentNames?.includes(aug.name)
                                  const shouldHighlight = isAugmentHovered || isSetAugmentHovered || isHighlightedFromBonusSource

                                  return (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Tooltip
                                        title={
                                          <Box>
                                            {aug.affixes.map((affix, i) => (
                                              <Typography key={i} variant="caption" display="block">
                                                {formatAffix(affix)}
                                              </Typography>
                                            ))}
                                            {aug.set && (
                                              <Typography variant="caption" display="block" color="secondary.light">
                                                Set: {aug.set}
                                              </Typography>
                                            )}
                                          </Box>
                                        }
                                      >
                                        <Typography
                                          variant="body2"
                                          onMouseEnter={() => {
                                            onAugmentHover?.(aug.name)
                                            if (aug.set) {
                                              onSetAugmentHover?.(aug.set)
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            onAugmentHover?.(null)
                                            onSetAugmentHover?.(null)
                                          }}
                                          sx={{
                                            cursor: 'help',
                                            backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                                            px: shouldHighlight ? 0.5 : 0,
                                            borderRadius: shouldHighlight ? 0.5 : 0,
                                            transition: 'all 0.2s',
                                            '&:hover': { color: 'primary.main' }
                                          }}
                                        >
                                          {aug.count > 1 ? `${aug.name} x${aug.count}` : aug.name}
                                        </Typography>
                                      </Tooltip>
                                      <Tooltip title="View on DDO Wiki">
                                        <IconButton
                                          size="small"
                                          component="a"
                                          href={getAugmentWikiUrl(aug.name)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          sx={{ p: 0.25 }}
                                        >
                                          <LaunchIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Tooltip>
                                      <InventoryBadge itemName={aug.name} variant="icon" size="small" />
                                      {onExcludedAugmentsChange && (
                                        <Tooltip title={excludedAugments.includes(aug.name) ? "Remove from ignore list" : "Ignore this augment"}>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              const newList = excludedAugments.includes(aug.name)
                                                ? excludedAugments.filter(name => name !== aug.name)
                                                : [...excludedAugments, aug.name]
                                              onExcludedAugmentsChange(newList)
                                            }}
                                            sx={{ p: 0.25 }}
                                            color={excludedAugments.includes(aug.name) ? "warning" : "default"}
                                          >
                                            <BlockIcon sx={{ fontSize: 14 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  )
                                })}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Set Items Dialog */}
      {availableItems && (
        <SetItemsDialog
          open={setDialogOpen}
          onClose={() => setSetDialogOpen(false)}
          setName={selectedSetName}
          allItems={availableItems}
          currentSetup={setup}
          setsData={setsData}
        />
      )}
    </Box>
  )
}
