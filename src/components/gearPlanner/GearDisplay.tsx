import { Box, Card, CardContent, Grid, IconButton, Tooltip, Typography } from '@mui/material'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'

import { Item, ItemAffix } from '@/api/ddoGearPlanner'
import { combineAffixes, GearSetup, getPropertyTotal, PropertyValue } from '@/domains/gearPlanner'
import { useWishlist } from '@/contexts/useWishlist'

interface GearDisplayProps {
  setup: GearSetup
  propertyValues: Map<string, number>
  selectedProperties: string[]
  hoveredProperty?: string | null
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

  // Get augment slots from crafting array
  const augmentSlots = item.crafting?.filter(c => c.toLowerCase().includes('augment slot')) || []

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

        {/* Augment Slots */}
        {augmentSlots.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Augment Slots:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {augmentSlots.map((augment, idx) => {
                const bgColor = getAugmentColor(augment)
                return (
                  <Box
                    key={idx}
                    component="span"
                    sx={{
                      bgcolor: bgColor || 'default',
                      color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontSize: '0.65rem',
                      display: 'inline-block',
                      lineHeight: 1.2
                    }}
                  >
                    {augment}
                  </Box>
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
  propertyValues,
  selectedProperties,
  hoveredProperty
}: GearDisplayProps) {
  const slots = ['armor', 'belt', 'boots', 'bracers', 'cloak', 'gloves', 'goggles', 'helm', 'necklace', 'ring1', 'ring2', 'trinket']

  // Only show slots that have items equipped
  const equippedSlots = slots.filter(slot => getItemForSlot(setup, slot) !== undefined)

  // Count augment slots from crafting array
  let totalAugments = 0
  let usedAugments = 0 // For now, all are unused since we don't track slotted augments

  equippedSlots.forEach(slot => {
    const item = getItemForSlot(setup, slot)
    if (item && item.crafting) {
      const augmentCount = item.crafting.filter(c => c.toLowerCase().includes('augment slot')).length
      totalAugments += augmentCount
    }
  })

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Selected Gear Setup
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {equippedSlots.map(slot => (
          <Grid xs={12} sm={6} md={4} lg={3} key={slot}>
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

      {selectedProperties.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Total Property Values
            </Typography>
            <Grid container spacing={2}>
              {selectedProperties.map(property => (
                <Grid xs={6} sm={4} md={3} key={property}>
                  <Typography variant="body2" color="text.secondary">
                    {property}
                  </Typography>
                  <Typography variant="h6">
                    {propertyValues.get(property) || 0}
                  </Typography>
                </Grid>
              ))}

              {/* Show augment slot usage */}
              <Grid xs={6} sm={4} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Augment Slots
                </Typography>
                <Typography variant="h6">
                  {usedAugments}/{totalAugments}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
