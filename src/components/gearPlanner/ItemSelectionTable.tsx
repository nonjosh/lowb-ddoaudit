import { type MouseEvent, useState } from 'react'

import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LaunchIcon from '@mui/icons-material/Launch'
import {
  Box,
  Button,
  Chip,
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

import { Item, ItemAffix, CraftingData, SetsData } from '@/api/ddoGearPlanner'
import { artifactTableRowSx } from '@/components/shared/artifactStyles'
import { useWishlist } from '@/contexts/useWishlist'
import { isRaidItem } from '@/domains/quests/questHelpers'
import { useRaidQuestNames } from '@/hooks/useRaidQuestNames'
import { formatAffix, getAugmentColor, getCraftingOptionsForSlot, getWikiUrl } from '@/utils/affixHelpers'
import ItemCraftingDisplay from '../items/ItemCraftingDisplay'
import InventoryBadge from './InventoryBadge'

interface ItemSelectionTableProps {
  items: Item[]
  currentItem?: Item
  onSelect: (item: Item) => void
  maxHeight?: number
  sortByML?: boolean
  craftingData?: CraftingData | null
  setsData?: SetsData | null
  improvementScores?: Map<string, number>
  sortByScore?: boolean
}

/**
 * Shared table component for displaying and selecting items
 * with wishlist, inventory badges, and property comparison
 */
export function ItemSelectionTable({
  items,
  currentItem,
  onSelect,
  maxHeight = 500,
  sortByML = true,
  craftingData,
  improvementScores,
  sortByScore = false
}: ItemSelectionTableProps) {
  const { isWished, toggleWish } = useWishlist()
  const raidQuestNames = useRaidQuestNames()
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null)
  const [displayLimit, setDisplayLimit] = useState(50)

  // Reset display limit when items list changes (e.g. new filter)
  const itemsKey = items.length
  const [prevItemsKey, setPrevItemsKey] = useState(itemsKey)
  if (itemsKey !== prevItemsKey) {
    setPrevItemsKey(itemsKey)
    setDisplayLimit(50)
  }

  // Sort items by score (desc), ML (desc), or keep original order
  const sortedItems = sortByScore && improvementScores
    ? [...items].sort((a, b) => {
      const scoreA = improvementScores.get(a.name) ?? -Infinity
      const scoreB = improvementScores.get(b.name) ?? -Infinity
      if (scoreB !== scoreA) return scoreB - scoreA
      return a.name.localeCompare(b.name)
    })
    : sortByML
      ? [...items].sort((a, b) => {
        if (a.ml !== b.ml) return b.ml - a.ml
        return a.name.localeCompare(b.name)
      })
      : items

  // Calculate property differences when hovering
  const getPropertyDiff = (item: Item, property: string): number | null => {
    if (!currentItem) return null

    const getCurrentValue = (affix: ItemAffix) => {
      if (typeof affix.value === 'number') return affix.value
      if (typeof affix.value === 'string') {
        const parsed = parseFloat(affix.value)
        return isNaN(parsed) ? 0 : parsed
      }
      return affix.type === 'bool' ? 1 : 0
    }

    const currentValue = currentItem.affixes
      .filter(a => a.name === property)
      .reduce((sum, a) => sum + getCurrentValue(a), 0)

    const newValue = item.affixes
      .filter(a => a.name === property)
      .reduce((sum, a) => sum + getCurrentValue(a), 0)

    return newValue - currentValue
  }

  // Get crafting options for tooltip
  const getCraftingOptions = (craft: string) => getCraftingOptionsForSlot(craft, craftingData ?? null)

  // Get all unique properties from both current and hovered item
  const getComparisonProperties = (): string[] => {
    if (!hoveredItem || !currentItem) return []

    const props = new Set<string>()
    currentItem.affixes.forEach(a => props.add(a.name))
    hoveredItem.affixes.forEach(a => props.add(a.name))

    return Array.from(props).sort()
  }

  // Limit displayed items
  const displayedItems = sortedItems.slice(0, displayLimit)
  const hasMore = sortedItems.length > displayLimit

  return (
    <TableContainer component={Paper} sx={{ maxHeight }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell align="center">ML</TableCell>
            {improvementScores && <TableCell align="right">Score</TableCell>}
            <TableCell>Effects</TableCell>
            <TableCell>Augments/Crafting</TableCell>
            <TableCell>Quest/Source</TableCell>
            <TableCell align="center">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={improvementScores ? 7 : 6} align="center">
                <Typography color="text.secondary">No items found</Typography>
              </TableCell>
            </TableRow>
          ) : (
            displayedItems.map((item) => {
              const isCurrent = currentItem?.name === item.name
              const wished = isWished(item)
              const isHovered = hoveredItem?.name === item.name

              // Show first 5 effects
              const displayAffixes = item.affixes.slice(0, 5)
              const hasMore = item.affixes.length > 5

              return (
                <TableRow
                  key={item.name}
                  hover
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: isCurrent ? 'action.selected' : 'inherit',
                    '&:hover': { bgcolor: isHovered ? 'action.hover' : undefined },
                    ...(item.artifact ? artifactTableRowSx : {})
                  }}
                  onClick={() => !isCurrent && onSelect(item)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isCurrent && (
                        <Tooltip title="Currently equipped">
                          <CheckCircleIcon fontSize="small" color="success" />
                        </Tooltip>
                      )}
                      <Typography variant="body2" fontWeight={isCurrent ? 'bold' : 'normal'}>
                        {item.name}
                      </Typography>
                      {getWikiUrl(item.url) && (
                        <Tooltip title="View on DDO Wiki">
                          <IconButton
                            size="small"
                            component="a"
                            href={getWikiUrl(item.url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e: MouseEvent) => e.stopPropagation()}
                            sx={{ p: 0.25 }}
                          >
                            <LaunchIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <InventoryBadge itemName={item.name} showBTC />
                      <Tooltip title={wished ? 'Remove from wishlist' : 'Add to wishlist'}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleWish(item)
                          }}
                          color={wished ? 'error' : 'default'}
                        >
                          {wished ? (
                            <FavoriteIcon fontSize="small" />
                          ) : (
                            <FavoriteBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {isRaidItem(item, raidQuestNames) && (
                      <Box>
                        <Chip label="Raid" size="small" color="error" variant="outlined" sx={{ mt: 0.5 }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="center">{item.ml}</TableCell>
                  {improvementScores && (() => {
                    const score = improvementScores.get(item.name)
                    return (
                      <TableCell align="right">
                        {score !== undefined ? (
                          <Chip
                            label={`${score > 0 ? '+' : ''}${score.toFixed(2)}`}
                            size="small"
                            color={score > 0 ? 'success' : score < 0 ? 'error' : 'default'}
                            variant="outlined"
                            sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    )
                  })()}
                  <TableCell>
                    <Box sx={{ maxWidth: 400 }}>
                      {displayAffixes.map((affix, idx) => (
                        <Typography key={idx} variant="caption" display="block">
                          {formatAffix(affix)}
                        </Typography>
                      ))}
                      {hasMore && (
                        <Typography variant="caption" color="text.secondary">
                          +{item.affixes.length - 5} more...
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.crafting && (
                      <ItemCraftingDisplay
                        crafting={item.crafting}
                        getAugmentColor={getAugmentColor}
                        getCraftingOptions={getCraftingOptions}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                      {item.quests?.[0] || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant={isCurrent ? 'outlined' : 'contained'}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(item)
                      }}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Current' : 'Select'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Property Comparison Tooltip */}
      {hoveredItem && currentItem && hoveredItem.name !== currentItem.name && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            p: 2,
            maxWidth: 400,
            bgcolor: 'background.paper',
            boxShadow: 3,
            zIndex: 1500
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Property Comparison vs {currentItem.name}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {getComparisonProperties().map((property) => {
              const diff = getPropertyDiff(hoveredItem, property)
              if (diff === null || diff === 0) return null

              return (
                <Typography
                  key={property}
                  variant="caption"
                  sx={{
                    color: diff > 0 ? 'success.main' : 'error.main',
                    fontWeight: 'bold'
                  }}
                >
                  {property}: {diff > 0 ? '+' : ''}{diff}
                </Typography>
              )
            })}
          </Box>
        </Paper>
      )}
      {hasMore && (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => setDisplayLimit(prev => prev + 50)}
          >
            Show more ({sortedItems.length - displayLimit} remaining)
          </Button>
        </Box>
      )}
    </TableContainer>
  )
}
