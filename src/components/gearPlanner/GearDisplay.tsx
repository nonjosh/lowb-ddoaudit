import { useState } from 'react'

import {
  Box,
  Card,
  CardContent,
  Collapse,
  Grid,
  IconButton,
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
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'

import { Item, ItemAffix } from '@/api/ddoGearPlanner'
import { GearCraftingSelections, GearSetup } from '@/domains/gearPlanner'
import { useWishlist } from '@/contexts/useWishlist'

interface GearDisplayProps {
  setup: GearSetup
  selectedProperties: string[]
  hoveredProperty?: string | null
  craftingSelections?: GearCraftingSelections
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

// Format affix display text
function formatAffix(affix: ItemAffix): string {
  let text = affix.name
  if (affix.value && affix.value !== 1 && affix.value !== '1' && affix.type !== 'bool') {
    text += ` +${affix.value}`
  }
  // Hide () if untyped bonus
  if (affix.type && affix.type !== 'bool' && affix.type !== '') {
    text += ` (${affix.type})`
  }
  return text
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
  hoveredProperty
}: {
  slotName: string
  item: Item | undefined
  selectedProperties: string[]
  setup: GearSetup
  slots: string[]
  hoveredProperty?: string | null
}) {
  const { isWished, toggleWish } = useWishlist()

  if (!item) {
    return (
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {slotName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Not equipped
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const wished = isWished(item)

  // Get all affixes - regular affixes only (not augment slots, those are in crafting array)
  const regularAffixes = item.affixes

  // Get all crafting slots from crafting array
  const craftingSlots = item.crafting || []

  // Check if this item has the hovered property
  const hasHoveredProperty = hoveredProperty && regularAffixes.some(a => a.name === hoveredProperty)

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        boxShadow: hasHoveredProperty ? 3 : 0,
        borderColor: hasHoveredProperty ? 'primary.main' : 'divider',
        borderWidth: hasHoveredProperty ? 2 : 1,
        transition: 'all 0.2s'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            {slotName}
          </Typography>
          <Tooltip title={wished ? "Remove from wishlist" : "Add to wishlist"}>
            <IconButton
              size="small"
              onClick={() => toggleWish(item)}
              sx={{ mt: -0.5, mr: -0.5 }}
            >
              {wished ? (
                <FavoriteIcon fontSize="small" color="error" />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          ML {item.ml}
        </Typography>

        {/* Quest/Source */}
        {item.quests && item.quests.length > 0 && (
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontStyle: 'italic' }}>
            {item.quests[0]}
          </Typography>
        )}

        {/* All Properties */}
        <Box sx={{ mt: 1 }}>
          {regularAffixes.map((affix, idx) => {
            const isHighest = selectedProperties.includes(affix.name) && isHighestBonus(item, affix, setup, slots)
            const isSelected = selectedProperties.includes(affix.name)
            const isHovered = hoveredProperty === affix.name

            return (
              <Typography
                key={idx}
                variant="caption"
                display="block"
                sx={{
                  fontWeight: isHighest ? 'bold' : 'normal',
                  color: isHighest ? 'primary.main' : (isSelected ? 'text.primary' : 'text.secondary'),
                  backgroundColor: isHovered ? 'action.selected' : 'transparent',
                  px: isHovered ? 0.5 : 0,
                  borderRadius: isHovered ? 0.5 : 0,
                  transition: 'all 0.2s'
                }}
              >
                {formatAffix(affix)}
              </Typography>
            )
          })}
        </Box>

        {/* Crafting Slots - show all crafting options */}
        {craftingSlots.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {craftingSlots.map((craftingSlot, idx) => {
                const bgColor = getAugmentColor(craftingSlot)
                // Get short name for display
                const shortName = craftingSlot
                  .replace(' Augment Slot', '')
                  .replace(' Slot', '')
                  .replace('(Accessory - Artifact)', '(Art)')
                  .replace('(Accessory)', '(Acc)')
                  .replace('(Weapon - Quarterstaff)', '(WpnQ)')
                  .replace('(Weapon)', '(Wpn)')
                  .replace('(Armor)', '(Arm)')

                return (
                  <Tooltip key={idx} title={craftingSlot}>
                    <Box
                      component="span"
                      sx={{
                        bgcolor: bgColor || 'grey.700',
                        color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontSize: '0.65rem',
                        display: 'inline-block',
                        lineHeight: 1.2
                      }}
                    >
                      {shortName}
                    </Box>
                  </Tooltip>
                )
              })}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default function GearDisplay({
  setup,
  selectedProperties,
  hoveredProperty,
  craftingSelections
}: GearDisplayProps) {
  const [craftingExpanded, setCraftingExpanded] = useState(false)
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Only show slots that have items equipped
  const equippedSlots = slots.filter(slot => getItemForSlot(setup, slot) !== undefined)

  // Collect all crafting selections grouped by slot type (including non-augments)
  // Track both total slots per type and slotted options
  const craftingSlotsByType = new Map<string, { total: number; slotted: { name: string; affixes: ItemAffix[]; set?: string }[] }>()
  let totalCraftingSlots = 0
  let usedCraftingSlots = 0

  equippedSlots.forEach(slot => {
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

          // Add to slotted list
          slotTypeData.slotted.push({
            name: selection.option.name || 'Unknown',
            affixes: selection.option.affixes || [],
            set: selection.option.set
          })
        }
      })
    }
  })

  // Group slotted items by name and count occurrences
  const groupSlottedByName = (slotted: { name: string; affixes: ItemAffix[]; set?: string }[]) => {
    const grouped = new Map<string, { count: number; affixes: ItemAffix[]; set?: string }>()
    for (const item of slotted) {
      if (grouped.has(item.name)) {
        grouped.get(item.name)!.count++
      } else {
        grouped.set(item.name, { count: 1, affixes: item.affixes, set: item.set })
      }
    }
    return Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      affixes: data.affixes,
      set: data.set
    }))
  }

  // Sort crafting slot types by priority (blue/yellow/red first, then green/purple/orange, then colorless, then others)
  const sortedCraftingTypes = Array.from(craftingSlotsByType.entries()).sort((a, b) => {
    const priorityA = getCraftingSlotPriority(a[0])
    const priorityB = getCraftingSlotPriority(b[0])
    if (priorityA !== priorityB) return priorityA - priorityB
    return a[0].localeCompare(b[0]) // alphabetical within same priority
  })

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Selected Gear Setup
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {equippedSlots.map(slot => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={slot}>
            <GearSlotCard
              slotName={slotDisplayNames[slot]}
              item={getItemForSlot(setup, slot)}
              selectedProperties={selectedProperties}
              setup={setup}
              slots={slots}
              hoveredProperty={hoveredProperty}
            />
          </Grid>
        ))}
      </Grid>

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
                      const shortName = slotType
                        .replace(' Augment Slot', '')
                        .replace(' Slot', '')

                      return (
                        <TableRow key={slotType}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 0.5,
                                  bgcolor: bgColor || 'grey.700'
                                }}
                              />
                              <Typography variant="body2">
                                {shortName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ({data.slotted.length}/{data.total})
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {groupedSlotted.length > 0 ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {groupedSlotted.map((aug, idx) => (
                                  <Tooltip
                                    key={idx}
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
                                      sx={{ cursor: 'help', '&:hover': { color: 'primary.main' } }}
                                    >
                                      {aug.count > 1 ? `${aug.name} x${aug.count}` : aug.name}
                                    </Typography>
                                  </Tooltip>
                                ))}
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
    </Box>
  )
}
