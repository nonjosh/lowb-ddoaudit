import type { ReactNode } from 'react'
import IconWrapper from "@/components/shared/IconWrapper"
import { useState, useMemo } from 'react'

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import BlockIcon from '@mui/icons-material/Block'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import LaunchIcon from '@mui/icons-material/Launch'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import {
  Box,
  Card,
  CardContent,
  Chip,
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
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

import { Item, ItemAffix, SetsData, CraftingData, CraftingOption } from '@/api/ddoGearPlanner'
import { artifactBorderLabelSx } from '@/components/shared/artifactStyles'
import { useWishlist } from '@/contexts/useWishlist'
import { isRaidItem } from '@/domains/quests/questHelpers'
import type { ItemFilterState } from '@/pages/GearPlanner'
import { useRaidQuestNames } from '@/hooks/useRaidQuestNames'
import {
  canAugmentFitInSlot,
  GearCraftingSelections,
  GearSetup,
  getAugmentColorFromName,
  getAugmentSlotColor,
  getCraftingSetMemberships,
  getOffHandWarning,
  isAugmentSlot,
  isOffHandBlocked,
  isOffHandRuneArmOnly,
  isRuneArm,
  isSingleHandedWeapon,
  isThrownWeapon,
  SelectedCraftingOption
} from '@/domains/gearPlanner'
import { generateCraftingOptionName } from '@/domains/gearPlanner/augmentHelpers'
import { formatAffix, getWikiUrl } from '@/utils/affixHelpers'

import AugmentSelectionDialog from './AugmentSelectionDialog'
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
  craftingData?: CraftingData | null
  onGearChange?: (slot: string, item: Item | undefined) => void
  availableItems?: Item[]
  onPropertyAdd?: (property: string) => void
  pinnedSlots?: Set<string>
  onTogglePin?: (slot: string, currentSetup: GearSetup) => void
  excludedItems?: string[]
  onToggleItemIgnore?: (itemName: string) => void
  excludedAugments?: string[]
  onExcludedAugmentsChange?: (augments: string[]) => void
  onCraftingChange?: (gearSlot: string, slotIndex: number, option: CraftingOption | null) => void
  onCraftingSelectionsChange?: (selections: GearCraftingSelections) => void
  /** Optional content rendered beside the "Selected Gear Setup" title (e.g. tabs) */
  headerSlot?: ReactNode
  /** Page-level item filters (passed as defaults to item selection dialogs) */
  itemFilters?: ItemFilterState
}

interface AugmentSlotReference {
  gearSlot: string
  slotIndex: number
}

function getAugmentSlotId(reference: AugmentSlotReference): string {
  return `${reference.gearSlot}:${reference.slotIndex}`
}

function parseAugmentSlotId(value: string): AugmentSlotReference | null {
  const [gearSlot, indexValue] = value.split(':')
  if (!gearSlot || indexValue === undefined) return null
  const slotIndex = Number(indexValue)
  if (Number.isNaN(slotIndex)) return null
  return { gearSlot, slotIndex }
}

const slotDisplayNames: Record<string, string> = {
  armor: 'Armor',
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
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

const gearSlots = ['armor', 'mainHand', 'offHand', 'goggles', 'helm', 'necklace', 'cloak', 'bracers', 'gloves', 'belt', 'boots', 'ring1', 'ring2', 'trinket']
const firstRowSlots = ['armor', 'mainHand', 'offHand']

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
  if (lower.includes('moon augment slot')) return '#607d8b'
  if (lower.includes('sun augment slot')) return '#fbc02d'
  return undefined
}

function renderAugmentMarker(text: string): ReactNode | null {
  const lower = text.toLowerCase()
  const iconSx = { fontSize: 13 }

  if (lower.includes('colorless augment') || lower.includes('diamond') || lower.includes('set augment')) {
    return <DiamondOutlinedIcon sx={iconSx} />
  }

  if (/\bmoon\b/.test(lower)) {
    return <DarkModeOutlinedIcon sx={iconSx} />
  }

  if (/\bsun\b/.test(lower)) {
    return <WbSunnyOutlinedIcon sx={iconSx} />
  }

  const color = getAugmentColor(text)
  if (!color) return null

  return <FiberManualRecordIcon sx={{ fontSize: 10, color }} />
}

function getCraftingOptionTooltipContent(option: CraftingOption | null | undefined): ReactNode | null {
  if (!option) return null

  const affixes = option.affixes ?? []
  if (affixes.length === 0 && !option.set) return null

  return (
    <Box>
      {affixes.map((affix, idx) => (
        <Typography key={`${affix.name}-${idx}`} variant="caption" display="block">
          {formatAffix(affix)}
        </Typography>
      ))}
      {option.set && (
        <Typography variant="caption" display="block" color="secondary.light">
          Set: {option.set}
        </Typography>
      )}
    </Box>
  )
}

function AugmentDropSlot({
  slotId,
  slotType,
  activeDragAugmentId,
  isFilled,
  isCompatible,
  children,
}: {
  slotId: string
  slotType: string
  activeDragAugmentId: string | null
  isFilled: boolean
  isCompatible: boolean
  children: ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    disabled: !isAugmentSlot(slotType),
  })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 0.5,
        outline: isOver && activeDragAugmentId ? '2px solid' : undefined,
        outlineColor: isOver ? (isCompatible ? 'success.main' : 'warning.main') : undefined,
        backgroundColor: isOver && !isCompatible ? 'action.hover' : 'transparent',
        opacity: activeDragAugmentId === slotId && isFilled ? 0.45 : 1,
      }}
    >
      {children}
    </Box>
  )
}

function DraggableAugmentHandle({ slotId, children }: { slotId: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({ id: slotId })

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <IconButton
        size="small"
        sx={{ p: 0.25, cursor: isDragging ? 'grabbing' : 'grab' }}
        {...listeners}
        {...attributes}
      >
        <DragIndicatorIcon sx={{ fontSize: 14 }} />
      </IconButton>
      {children}
    </Box>
  )
}

// Convert augment name to ddowiki URL format
function getAugmentWikiUrl(augmentName: string): string {
  // Replace spaces with underscores for ddowiki URL format
  const formattedName = augmentName.replace(/\s+/g, '_')
  return `https://ddowiki.com/page/Item:${formattedName}`
}

// Crafting slot type priority for sorting
// blue/yellow/red => green/purple/orange => colorless => moon/sun => Lammodia accessory => Lammodia weapon => others
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

  // Lammodia augments (Melancholic, Dolorous, Miserable, Woeful)
  const isLammodia = lower.includes('melancholic') || lower.includes('dolorous') ||
    lower.includes('miserable') || lower.includes('woeful')
  if (isLammodia) {
    // Accessory variants come before weapon variants
    if (lower.includes('accessory')) return 97 // Lammodia accessory
    if (lower.includes('armor')) return 98 // Lammodia armor
    return 99 // Lammodia weapon
  }

  return 100 // others
}

// Check if this property has the highest bonus of its type across all gear
// (including both item affixes and augment/crafting affixes)
function isHighestBonus(
  sourceItem: Item | undefined,
  affix: ItemAffix,
  setup: GearSetup,
  slots: string[],
  craftingSelections?: GearCraftingSelections,
  sourceSlot?: string,
  isAugmentAffix?: boolean
): boolean {
  if (affix.type === 'bool') return false

  const value = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
  if (isNaN(value)) return false

  // Check all items and their augments for the same property and type
  for (const slot of slots) {
    const otherItem = getItemForSlot(setup, slot)

    // Check item affixes
    if (otherItem && otherItem !== sourceItem) {
      for (const otherAffix of otherItem.affixes) {
        if (otherAffix.name === affix.name && otherAffix.type === affix.type) {
          const otherValue = typeof otherAffix.value === 'string' ? parseFloat(otherAffix.value) : otherAffix.value
          if (!isNaN(otherValue) && otherValue > value) {
            return false
          }
        }
      }
    }

    // Check crafting/augment affixes
    const slotSelections = craftingSelections?.[slot]
    if (slotSelections) {
      for (const selection of slotSelections) {
        if (!selection?.option?.affixes) continue
        // Skip self-comparison: same slot and this is an augment affix
        if (slot === sourceSlot && isAugmentAffix) continue
        for (const otherAffix of selection.option.affixes) {
          if (otherAffix.name === affix.name && otherAffix.type === affix.type) {
            const otherValue = typeof otherAffix.value === 'string' ? parseFloat(otherAffix.value) : otherAffix.value
            if (!isNaN(otherValue) && otherValue > value) {
              return false
            }
          }
        }
      }
    }
  }

  return true
}

function GearSlotCard({
  slotName,
  slotKey,
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
  craftingData,
  setsData,
  onPropertyAdd,
  isPinned,
  onTogglePin,
  isIgnored,
  onToggleIgnore,
  slotCraftingSelections,
  craftingSelections,
  onCraftingChange,
  warningText,
  defaultMinLevel,
  defaultMaxLevel,
  defaultTypeFilter,
  defaultPackFilter,
}: {
  slotName: string
  slotKey: string
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
  craftingData?: CraftingData | null
  setsData?: SetsData | null
  onPropertyAdd?: (property: string) => void
  isPinned?: boolean
  onTogglePin?: () => void
  isIgnored?: boolean
  onToggleIgnore?: () => void
  slotCraftingSelections?: SelectedCraftingOption[]
  craftingSelections?: GearCraftingSelections
  onCraftingChange?: (slotIndex: number, option: CraftingOption | null) => void
  warningText?: string | null
  defaultMinLevel?: number
  defaultMaxLevel?: number
  defaultTypeFilter?: string[]
  defaultPackFilter?: string[]
}) {
  const { isWished, toggleWish } = useWishlist()
  const raidQuestNames = useRaidQuestNames()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [augmentDialogIndex, setAugmentDialogIndex] = useState<number | null>(null)


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
                    sx={{ p: 0, mt: -0.5, mr: -0.5 }}
                  >
                    {isPinned ? (
                      <IconWrapper color="primary.main"><PushPinIcon /></IconWrapper>
                    ) : (
                      <IconWrapper><PushPinOutlinedIcon /></IconWrapper>
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Not equipped
              </Typography>
              {onGearChange && availableItems && availableItems.length > 0 && (
                <Tooltip title="Select item">
                  <IconButton
                    size="small"
                    onClick={() => setDialogOpen(true)}
                    sx={{ p: 0 }}
                  >
                    <IconWrapper><SwapHorizIcon /></IconWrapper>
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            {warningText && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                ⚠️ {warningText}
              </Typography>
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
            craftingData={craftingData}
            setsData={setsData}
            defaultMinLevel={defaultMinLevel}
            defaultMaxLevel={defaultMaxLevel}
            defaultTypeFilter={defaultTypeFilter}
            defaultPackFilter={defaultPackFilter}
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
            ...artifactBorderLabelSx,
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
                    sx={{ p: 0 }}
                  >
                    {isPinned ? (
                      <PushPinIcon fontSize="small" />
                    ) : (
                      <IconWrapper><PushPinOutlinedIcon /></IconWrapper>
                    )}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={wished ? "Remove from wishlist" : "Add to wishlist"}>
                <IconButton
                  size="small"
                  onClick={() => toggleWish(item)}
                  sx={{ p: 0 }}
                >
                  {wished ? (
                    <FavoriteIcon fontSize="small" color="error" />
                  ) : (
                    <IconWrapper><FavoriteBorderIcon /></IconWrapper>
                  )}
                </IconButton>
              </Tooltip>
              {onToggleIgnore && (
                <Tooltip title={isIgnored ? "Remove from ignore list" : "Ignore this item"}>
                  <IconButton
                    size="small"
                    onClick={onToggleIgnore}
                    color={isIgnored ? "warning" : "default"}
                    sx={{ p: 0 }}
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
                  sx={{ p: 0, ml: 0.5 }}
                >
                  <SwapHorizIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                ML {item.ml}
              </Typography>
              {item.type && (
                <Typography variant="caption" color="text.secondary">
                  • {item.type}
                </Typography>
              )}
              {isRaidItem(item, raidQuestNames) && (
                <Chip label="Raid" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Box>
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
              const isHighest = selectedProperties.includes(affix.name) && isHighestBonus(item, affix, setup, slots, craftingSelections, slotKey, false)
              const isSelected = selectedProperties.includes(affix.name)
              const isHovered = hoveredProperty === affix.name
              const isNonStacking = isSelected && !isHighest && affix.type !== 'bool'

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
                  <Tooltip title={isNonStacking ? 'Does not stack (superseded by higher bonus)' : ''} disableHoverListener={!isNonStacking}>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{
                        flex: 1,
                        fontWeight: isHighest ? 'bold' : 'normal',
                        color: isNonStacking ? 'text.disabled' : (isHighest ? 'primary.main' : (isSelected ? 'text.primary' : 'text.secondary')),
                        textDecoration: isNonStacking ? 'line-through' : 'none',
                        backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                        px: shouldHighlight ? 0.5 : 0,
                        borderRadius: shouldHighlight ? 0.5 : 0,
                        transition: 'all 0.2s'
                      }}
                    >
                      {formatAffix(affix)}
                    </Typography>
                  </Tooltip>
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
                const selection = slotCraftingSelections?.[idx]
                const selectedOptionName = selection?.option
                  ? generateCraftingOptionName(selection.option)
                  : null
                const selectedOptionTooltip = getCraftingOptionTooltipContent(selection?.option)
                const canEdit = !!onCraftingChange && !!craftingData
                const augmentAffixes = selection?.option?.affixes ?? []
                const slotMarker = renderAugmentMarker(craftingSlot)
                const selectedOptionMarker = selectedOptionName ? renderAugmentMarker(selectedOptionName) : null
                return (
                  <Box key={idx} sx={{ mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                      <Box
                        component="span"
                        sx={{
                          bgcolor: bgColor || 'grey.700',
                          color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          lineHeight: 1.2,
                          flexShrink: 0
                        }}
                      >
                        {slotMarker}
                        {craftingSlot}
                      </Box>
                      {canEdit ? (
                        <Tooltip
                          title={selectedOptionTooltip ?? 'Click to change augment / crafting option'}
                          disableHoverListener={!selectedOptionTooltip}
                        >
                          <Box
                            component="span"
                            onClick={() => setAugmentDialogIndex(idx)}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              fontSize: '0.7rem',
                              color: selectedOptionName ? 'text.primary' : 'text.disabled',
                              cursor: 'pointer',
                              borderBottom: '1px dashed',
                              borderColor: selectedOptionName ? 'text.secondary' : 'text.disabled',
                              lineHeight: 1.4,
                              '&:hover': { color: 'primary.main', borderColor: 'primary.main' }
                            }}
                          >
                            {selectedOptionMarker}
                            {selectedOptionName ?? '(empty)'}
                          </Box>
                        </Tooltip>
                      ) : selectedOptionName ? (
                        <Tooltip title={selectedOptionTooltip ?? ''} disableHoverListener={!selectedOptionTooltip}>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            {selectedOptionMarker}
                            {selectedOptionName}
                          </Typography>
                        </Tooltip>
                      ) : null}
                    </Box>
                    {/* Augment affixes with strikethrough for non-stacking */}
                    {augmentAffixes.length > 0 && (
                      <Box sx={{ ml: 2 }}>
                        {augmentAffixes.filter(a => a.type !== 'bool').map((affix, affixIdx) => {
                          const isSelected = selectedProperties.includes(affix.name)
                          const isHighest = isSelected && isHighestBonus(undefined, affix, setup, slots, craftingSelections, slotKey, true)
                          const isNonStacking = isSelected && !isHighest
                          const isHovered = hoveredProperty === affix.name
                          const isBonusSourceHovered = hoveredBonusSource &&
                            affix.name === hoveredBonusSource.property &&
                            (affix.type || 'Untyped') === hoveredBonusSource.bonusType
                          const shouldHighlight = isHovered || isBonusSourceHovered

                          return (
                            <Tooltip key={affixIdx} title={isNonStacking ? 'Does not stack (superseded by higher bonus)' : ''} disableHoverListener={!isNonStacking}>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: isHighest ? 'bold' : 'normal',
                                  color: isNonStacking ? 'text.disabled' : (isHighest ? 'primary.main' : (isSelected ? 'text.primary' : 'text.secondary')),
                                  textDecoration: isNonStacking ? 'line-through' : 'none',
                                  backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                                  px: shouldHighlight ? 0.5 : 0,
                                  borderRadius: shouldHighlight ? 0.5 : 0,
                                  transition: 'all 0.2s'
                                }}
                              >
                                {formatAffix(affix)}
                              </Typography>
                            </Tooltip>
                          )
                        })}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
          {warningText && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
              ⚠️ {warningText}
            </Typography>
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
          craftingData={craftingData}
          setsData={setsData}
          defaultMinLevel={defaultMinLevel}
          defaultMaxLevel={defaultMaxLevel}
          defaultTypeFilter={defaultTypeFilter}
          defaultPackFilter={defaultPackFilter}
        />
      )}
      {/* Augment Selection Dialog */}
      {onCraftingChange && craftingData && augmentDialogIndex !== null && item && (
        <AugmentSelectionDialog
          open
          onClose={() => setAugmentDialogIndex(null)}
          slotType={craftingSlots[augmentDialogIndex] ?? ''}
          itemName={item.name}
          itemML={item.ml}
          currentOption={slotCraftingSelections?.[augmentDialogIndex]?.option ?? null}
          craftingData={craftingData}
          onSelect={(option) => onCraftingChange(augmentDialogIndex, option)}
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
  craftingData,
  onGearChange,
  availableItems,
  onPropertyAdd,
  pinnedSlots,
  onTogglePin,
  excludedItems = [],
  onToggleItemIgnore,
  excludedAugments = [],
  onExcludedAugmentsChange,
  onCraftingChange,
  onCraftingSelectionsChange,
  headerSlot,
  itemFilters,
}: GearDisplayProps) {
  const { isWished, toggleWish } = useWishlist()
  // Default expanded when editing is available so users can see the augment slots
  const [craftingExpanded, setCraftingExpanded] = useState(() => !!onCraftingChange)
  const [setDialogOpen, setSetDialogOpen] = useState(false)
  const [selectedSetName, setSelectedSetName] = useState<string>('')
  const [activeDragAugmentId, setActiveDragAugmentId] = useState<string | null>(null)
  const [summaryAugmentDialog, setSummaryAugmentDialog] = useState<{
    slotType: string
    gearSlot: string
    slotIndex: number
    itemName: string
    itemML: number
    currentOption: CraftingOption | null
  } | null>(null)
  const slots = gearSlots
  const dragSensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }))

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
  const craftingSlotsByType = new Map<string, {
    total: number
    slotted: { name: string; affixes: ItemAffix[]; set?: string; slot: string; slotIndex: number; itemName: string; itemML: number }[]
    emptySlots: { gearSlot: string; slotIndex: number; itemName: string; itemML: number }[]
  }>()
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
          craftingSlotsByType.set(craftingSlotType, { total: 0, slotted: [], emptySlots: [] })
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
            slot,
            slotIndex: idx,
            itemName: item.name,
            itemML: item.ml
          })
        } else {
          // Track empty slots so they can be edited from the summary table
          slotTypeData.emptySlots.push({
            gearSlot: slot,
            slotIndex: idx,
            itemName: item.name,
            itemML: item.ml
          })
        }
      })
    }
  })

  // Group slotted items by name and count occurrences (for read-only summary display)
  const groupSlottedByName = (slotted: { name: string; affixes: ItemAffix[]; set?: string; slot: string; slotIndex: number; itemName: string; itemML: number }[]) => {
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

  // Memoize slot-specific available items filtering to prevent lag when changing items
  const slotAvailableItemsMap = useMemo(() => {
    const map = new Map<string, Item[]>()
    if (!availableItems) return map

    gearSlots.forEach(slot => {
      const filtered = availableItems.filter(item => {
        if (slot === 'ring1' || slot === 'ring2') {
          return item.slot === 'Ring'
        }
        if (slot === 'mainHand') {
          return item.slot === 'Weapon'
        }
        if (slot === 'offHand') {
          // Filter off-hand options based on main hand weapon
          if (isOffHandBlocked(setup.mainHand)) {
            return false
          }
          if (isOffHandRuneArmOnly(setup.mainHand)) {
            return isRuneArm(item)
          }
          // Thrown weapons are main-hand only
          if (item.slot === 'Weapon' && isThrownWeapon(item)) {
            return false
          }
          // Only one-handed weapons allowed in off-hand
          if (item.slot === 'Weapon' && !isSingleHandedWeapon(item)) {
            return false
          }
          return item.slot === 'Offhand' || item.slot === 'Weapon'
        }
        return item.slot === slotDisplayNames[slot]
      })
      map.set(slot, filtered)
    })

    return map
  }, [availableItems, setup.mainHand])

  const getResolvedCraftingSelections = (gearSlot: string): SelectedCraftingOption[] => {
    const existingSelections = craftingSelections?.[gearSlot]
    if (existingSelections) return existingSelections.map((selection) => ({ ...selection }))

    const item = getItemForSlot(setup, gearSlot)
    return item?.crafting?.map((slotType) => ({ slotType, option: null })) ?? []
  }

  const canDropAugmentIntoSlot = (option: CraftingOption | null | undefined, targetSlotType: string): boolean => {
    if (!option || !isAugmentSlot(targetSlotType)) return false

    const augmentColor = getAugmentColorFromName(generateCraftingOptionName(option))
    const targetSlotColor = getAugmentSlotColor(targetSlotType)
    if (!augmentColor || !targetSlotColor) return false

    return canAugmentFitInSlot(augmentColor, targetSlotColor)
  }

  const handleAugmentDragStart = (event: DragStartEvent) => {
    setActiveDragAugmentId(String(event.active.id))
  }

  const handleAugmentDragEnd = (event: DragEndEvent) => {
    setActiveDragAugmentId(null)

    if (!onCraftingSelectionsChange || !event.over) return

    const sourceRef = parseAugmentSlotId(String(event.active.id))
    const targetRef = parseAugmentSlotId(String(event.over.id))
    if (!sourceRef || !targetRef) return
    if (sourceRef.gearSlot === targetRef.gearSlot && sourceRef.slotIndex === targetRef.slotIndex) return

    const sourceItem = getItemForSlot(setup, sourceRef.gearSlot)
    const targetItem = getItemForSlot(setup, targetRef.gearSlot)
    const sourceSlotType = sourceItem?.crafting?.[sourceRef.slotIndex]
    const targetSlotType = targetItem?.crafting?.[targetRef.slotIndex]
    if (!sourceItem || !targetItem || !sourceSlotType || !targetSlotType) return
    if (!isAugmentSlot(sourceSlotType) || !isAugmentSlot(targetSlotType)) return

    const nextSelections: GearCraftingSelections = {
      ...(craftingSelections ?? {}),
      [sourceRef.gearSlot]: getResolvedCraftingSelections(sourceRef.gearSlot),
      [targetRef.gearSlot]: sourceRef.gearSlot === targetRef.gearSlot
        ? getResolvedCraftingSelections(sourceRef.gearSlot)
        : getResolvedCraftingSelections(targetRef.gearSlot),
    }

    const sourceSelections = nextSelections[sourceRef.gearSlot]
    const targetSelections = sourceRef.gearSlot === targetRef.gearSlot
      ? sourceSelections
      : nextSelections[targetRef.gearSlot]

    const sourceOption = sourceSelections[sourceRef.slotIndex]?.option ?? null
    const targetOption = targetSelections[targetRef.slotIndex]?.option ?? null
    if (!sourceOption) return
    if (!canDropAugmentIntoSlot(sourceOption, targetSlotType)) return
    if (targetOption && !canDropAugmentIntoSlot(targetOption, sourceSlotType)) return

    sourceSelections[sourceRef.slotIndex] = {
      ...sourceSelections[sourceRef.slotIndex],
      option: targetOption,
    }
    targetSelections[targetRef.slotIndex] = {
      ...targetSelections[targetRef.slotIndex],
      option: sourceOption,
    }

    onCraftingSelectionsChange(nextSelections)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexShrink: 0 }}>
          Selected Gear Setup
        </Typography>
        {headerSlot && <Box sx={{ flex: 1, minWidth: 0 }}>{headerSlot}</Box>}
      </Box>

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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {firstRowSlots.map(slot => {
          const slotAvailableItems = slotAvailableItemsMap.get(slot)

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={slot}>
              <GearSlotCard
                slotName={slotDisplayNames[slot]}
                slotKey={slot}
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
                craftingData={craftingData}
                setsData={setsData}
                onPropertyAdd={onPropertyAdd}
                isPinned={pinnedSlots?.has(slot)}
                onTogglePin={onTogglePin ? () => onTogglePin(slot, setup) : undefined}
                isIgnored={getItemForSlot(setup, slot) ? excludedItems.includes(getItemForSlot(setup, slot)!.name) : false}
                onToggleIgnore={onToggleItemIgnore && getItemForSlot(setup, slot) ? () => onToggleItemIgnore(getItemForSlot(setup, slot)!.name) : undefined}
                slotCraftingSelections={craftingSelections?.[slot]}
                craftingSelections={craftingSelections}
                onCraftingChange={onCraftingChange ? (slotIndex, option) => onCraftingChange(slot, slotIndex, option) : undefined}
                warningText={slot === 'offHand' ? getOffHandWarning(setup.mainHand, setup.offHand) : undefined}
                defaultMinLevel={itemFilters?.minLevel}
                defaultMaxLevel={itemFilters?.maxLevel}
                defaultTypeFilter={slot === 'armor' ? itemFilters?.armorTypes : slot === 'mainHand' ? itemFilters?.mainHandTypes : slot === 'offHand' ? itemFilters?.offHandTypes : undefined}
                defaultPackFilter={itemFilters?.includedPacks}
              />
            </Grid>
          )
        })}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {allSlots.filter(slot => !firstRowSlots.includes(slot)).map(slot => {
          const slotAvailableItems = slotAvailableItemsMap.get(slot)

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={slot}>
              <GearSlotCard
                slotName={slotDisplayNames[slot]}
                slotKey={slot}
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
                craftingData={craftingData}
                setsData={setsData}
                onPropertyAdd={onPropertyAdd}
                isPinned={pinnedSlots?.has(slot)}
                onTogglePin={onTogglePin ? () => onTogglePin(slot, setup) : undefined}
                isIgnored={getItemForSlot(setup, slot) ? excludedItems.includes(getItemForSlot(setup, slot)!.name) : false}
                onToggleIgnore={onToggleItemIgnore && getItemForSlot(setup, slot) ? () => onToggleItemIgnore(getItemForSlot(setup, slot)!.name) : undefined}
                slotCraftingSelections={craftingSelections?.[slot]}
                craftingSelections={craftingSelections}
                onCraftingChange={onCraftingChange ? (slotIndex, option) => onCraftingChange(slot, slotIndex, option) : undefined}
                defaultMinLevel={itemFilters?.minLevel}
                defaultMaxLevel={itemFilters?.maxLevel}
                defaultPackFilter={itemFilters?.includedPacks}
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
              <DndContext sensors={dragSensors} onDragStart={handleAugmentDragStart} onDragEnd={handleAugmentDragEnd}>
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
                        const canEditAugments = !!onCraftingChange && !!craftingData
                        const dragEnabled = canEditAugments && !!onCraftingSelectionsChange && isAugmentSlot(slotType)
                        const getHighlight = (name: string, set?: string) => {
                          return !!(hoveredAugment === name || (set && hoveredSetAugment === set) || hoveredBonusSource?.augmentNames?.includes(name))
                        }

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
                                {dragEnabled && (
                                  <Typography variant="caption" color="text.secondary">
                                    Drag handle to move
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {canEditAugments ? (
                                /* Editable mode: show all slots individually (filled + empty) */
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                  {/* Filled slots */}
                                  {data.slotted.map((s, idx) => {
                                    const shouldHighlight = getHighlight(s.name, s.set)
                                    const slotId = getAugmentSlotId({ gearSlot: s.slot, slotIndex: s.slotIndex })
                                    const currentOption = craftingSelections?.[s.slot]?.[s.slotIndex]?.option ?? null
                                    const dragSourceRef = activeDragAugmentId ? parseAugmentSlotId(activeDragAugmentId) : null
                                    const draggedOption = dragSourceRef
                                      ? craftingSelections?.[dragSourceRef.gearSlot]?.[dragSourceRef.slotIndex]?.option ?? null
                                      : null
                                    const isCompatible = !activeDragAugmentId || canDropAugmentIntoSlot(draggedOption, slotType)

                                    return (
                                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" color="text.disabled" sx={{ minWidth: 70, flexShrink: 0 }}>
                                          {slotDisplayNames[s.slot] ?? s.slot}:
                                        </Typography>
                                        <AugmentDropSlot slotId={slotId} slotType={slotType} activeDragAugmentId={activeDragAugmentId} isFilled={true} isCompatible={isCompatible}>
                                          <Tooltip
                                            title={getCraftingOptionTooltipContent(currentOption) ?? 'Click to change augment / crafting option'}
                                            disableHoverListener={!getCraftingOptionTooltipContent(currentOption)}
                                          >
                                            {dragEnabled ? (
                                              <DraggableAugmentHandle slotId={slotId}>
                                                <Box
                                                  component="span"
                                                  onClick={() => {
                                                    setSummaryAugmentDialog({
                                                      slotType,
                                                      gearSlot: s.slot,
                                                      slotIndex: s.slotIndex,
                                                      itemName: s.itemName,
                                                      itemML: s.itemML,
                                                      currentOption,
                                                    })
                                                  }}
                                                  onMouseEnter={() => {
                                                    onAugmentHover?.(s.name)
                                                    if (s.set) onSetAugmentHover?.(s.set)
                                                  }}
                                                  onMouseLeave={() => {
                                                    onAugmentHover?.(null)
                                                    onSetAugmentHover?.(null)
                                                  }}
                                                  sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    fontSize: '0.75rem',
                                                    color: 'text.primary',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px dashed',
                                                    borderColor: 'text.secondary',
                                                    lineHeight: 1.4,
                                                    backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                                                    px: shouldHighlight ? 0.25 : 0,
                                                    borderRadius: shouldHighlight ? 0.5 : 0,
                                                    transition: 'all 0.2s',
                                                    '&:hover': { color: 'primary.main', borderColor: 'primary.main' }
                                                  }}
                                                >
                                                  {renderAugmentMarker(s.name)}
                                                  {s.name}
                                                </Box>
                                              </DraggableAugmentHandle>
                                            ) : (
                                              <Box
                                                component="span"
                                                onClick={() => {
                                                  setSummaryAugmentDialog({
                                                    slotType,
                                                    gearSlot: s.slot,
                                                    slotIndex: s.slotIndex,
                                                    itemName: s.itemName,
                                                    itemML: s.itemML,
                                                    currentOption,
                                                  })
                                                }}
                                                onMouseEnter={() => {
                                                  onAugmentHover?.(s.name)
                                                  if (s.set) onSetAugmentHover?.(s.set)
                                                }}
                                                onMouseLeave={() => {
                                                  onAugmentHover?.(null)
                                                  onSetAugmentHover?.(null)
                                                }}
                                                sx={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 0.5,
                                                  fontSize: '0.75rem',
                                                  color: 'text.primary',
                                                  cursor: 'pointer',
                                                  borderBottom: '1px dashed',
                                                  borderColor: 'text.secondary',
                                                  lineHeight: 1.4,
                                                  backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                                                  px: shouldHighlight ? 0.25 : 0,
                                                  borderRadius: shouldHighlight ? 0.5 : 0,
                                                  transition: 'all 0.2s',
                                                  '&:hover': { color: 'primary.main', borderColor: 'primary.main' }
                                                }}
                                              >
                                                {renderAugmentMarker(s.name)}
                                                {s.name}
                                              </Box>
                                            )}
                                          </Tooltip>
                                        </AugmentDropSlot>
                                        <Tooltip title="View on DDO Wiki">
                                          <IconButton
                                            size="small"
                                            component="a"
                                            href={getAugmentWikiUrl(s.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ p: 0.25 }}
                                          >
                                            <LaunchIcon sx={{ fontSize: 14 }} />
                                          </IconButton>
                                        </Tooltip>
                                        <InventoryBadge itemName={s.name} variant="icon" size="small" />
                                        {(() => {
                                          const augmentItem = { name: s.name, ml: 0, isAugment: true as const, affixes: s.affixes }
                                          const wished = isWished(augmentItem)
                                          return (
                                            <Tooltip title={wished ? "Remove from wishlist" : "Add to wishlist"}>
                                              <IconButton
                                                size="small"
                                                onClick={() => toggleWish(augmentItem)}
                                                sx={{ p: 0.25 }}
                                              >
                                                {wished ? (
                                                  <FavoriteIcon sx={{ fontSize: 14 }} color="error" />
                                                ) : (
                                                  <FavoriteBorderIcon sx={{ fontSize: 14 }} />
                                                )}
                                              </IconButton>
                                            </Tooltip>
                                          )
                                        })()}
                                        {onExcludedAugmentsChange && (
                                          <Tooltip title={excludedAugments.includes(s.name) ? "Remove from ignore list" : "Ignore this augment"}>
                                            <IconButton
                                              size="small"
                                              onClick={() => {
                                                const newList = excludedAugments.includes(s.name)
                                                  ? excludedAugments.filter(name => name !== s.name)
                                                  : [...excludedAugments, s.name]
                                                onExcludedAugmentsChange(newList)
                                              }}
                                              sx={{ p: 0.25 }}
                                              color={excludedAugments.includes(s.name) ? "warning" : "default"}
                                            >
                                              <BlockIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                          </Tooltip>
                                        )}
                                      </Box>
                                    )
                                  })}
                                  {/* Empty slots */}
                                  {data.emptySlots.map((e, idx) => (
                                    <Box key={`empty-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="caption" color="text.disabled" sx={{ minWidth: 70, flexShrink: 0 }}>
                                        {slotDisplayNames[e.gearSlot] ?? e.gearSlot}:
                                      </Typography>
                                      <AugmentDropSlot
                                        slotId={getAugmentSlotId({ gearSlot: e.gearSlot, slotIndex: e.slotIndex })}
                                        slotType={slotType}
                                        activeDragAugmentId={activeDragAugmentId}
                                        isFilled={false}
                                        isCompatible={!activeDragAugmentId || (() => {
                                          const dragRef = parseAugmentSlotId(activeDragAugmentId)
                                          if (!dragRef) return false
                                          const option = craftingSelections?.[dragRef.gearSlot]?.[dragRef.slotIndex]?.option ?? null
                                          return canDropAugmentIntoSlot(option, slotType)
                                        })()}
                                      >
                                        <Tooltip title={dragEnabled ? 'Drop a compatible augment here or click to add one' : 'Click to add augment / crafting option'}>
                                          <Box
                                            component="span"
                                            onClick={() => setSummaryAugmentDialog({
                                              slotType,
                                              gearSlot: e.gearSlot,
                                              slotIndex: e.slotIndex,
                                              itemName: e.itemName,
                                              itemML: e.itemML,
                                              currentOption: null
                                            })}
                                            sx={{
                                              fontSize: '0.75rem',
                                              color: 'text.disabled',
                                              cursor: 'pointer',
                                              borderBottom: '1px dashed',
                                              borderColor: 'text.disabled',
                                              lineHeight: 1.4,
                                              px: 0.25,
                                              borderRadius: 0.5,
                                              '&:hover': { color: 'primary.main', borderColor: 'primary.main' }
                                            }}
                                          >
                                            (empty)
                                          </Box>
                                        </Tooltip>
                                      </AugmentDropSlot>
                                    </Box>
                                  ))}
                                </Box>
                              ) : (
                                /* Read-only mode: grouped display */
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {groupedSlotted.map((aug, idx) => {
                                    const shouldHighlight = getHighlight(aug.name, aug.set)

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
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 0.5,
                                              cursor: 'help',
                                              backgroundColor: shouldHighlight ? 'action.selected' : 'transparent',
                                              px: shouldHighlight ? 0.5 : 0,
                                              borderRadius: shouldHighlight ? 0.5 : 0,
                                              transition: 'all 0.2s',
                                              '&:hover': { color: 'primary.main' }
                                            }}
                                          >
                                            {renderAugmentMarker(aug.name)}
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
                                        {(() => {
                                          const augmentItem = { name: aug.name, ml: 0, isAugment: true as const, affixes: aug.affixes }
                                          const wished = isWished(augmentItem)
                                          return (
                                            <Tooltip title={wished ? "Remove from wishlist" : "Add to wishlist"}>
                                              <IconButton
                                                size="small"
                                                onClick={() => toggleWish(augmentItem)}
                                                sx={{ p: 0.25 }}
                                              >
                                                {wished ? (
                                                  <FavoriteIcon sx={{ fontSize: 14 }} color="error" />
                                                ) : (
                                                  <FavoriteBorderIcon sx={{ fontSize: 14 }} />
                                                )}
                                              </IconButton>
                                            </Tooltip>
                                          )
                                        })()}
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
                                  {groupedSlotted.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                      —
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DndContext>
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

      {/* Augment Selection Dialog (from Slotted Crafting Options summary) */}
      {summaryAugmentDialog && onCraftingChange && craftingData && (
        <AugmentSelectionDialog
          open={true}
          onClose={() => setSummaryAugmentDialog(null)}
          slotType={summaryAugmentDialog.slotType}
          itemName={summaryAugmentDialog.itemName}
          itemML={summaryAugmentDialog.itemML}
          currentOption={summaryAugmentDialog.currentOption}
          craftingData={craftingData}
          onSelect={(option) => {
            onCraftingChange(summaryAugmentDialog.gearSlot, summaryAugmentDialog.slotIndex, option)
          }}
        />
      )}
    </Box>
  )
}
