import { useState } from 'react'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import {
  Box,
  Button,
  Paper,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'

import { Item, ItemAffix, CraftingData, SetsData } from '@/api/ddoGearPlanner'
import ItemTable from '@/components/items/ItemTable'

interface ItemSelectionTableProps {
  items: Item[]
  currentItem?: Item
  onSelect: (item: Item) => void
  maxHeight?: number
  sortByML?: boolean
  craftingData?: CraftingData | null
  setsData?: SetsData | null
}

/**
 * Item selection table for gear planner, built on shared ItemTable.
 * Adds currently-equipped indicator, Select button, property comparison, and pagination.
 */
export function ItemSelectionTable({
  items,
  currentItem,
  onSelect,
  maxHeight = 500,
  sortByML = true,
  craftingData,
  setsData,
}: ItemSelectionTableProps) {
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null)
  const [displayLimit, setDisplayLimit] = useState(50)

  // Reset display limit when items list changes (e.g. new filter)
  const itemsKey = items.length
  const [prevItemsKey, setPrevItemsKey] = useState(itemsKey)
  if (itemsKey !== prevItemsKey) {
    setPrevItemsKey(itemsKey)
    setDisplayLimit(50)
  }

  // Sort items by ML (desc) or keep original order
  const sortedItems = sortByML
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
    <Box
      sx={{ maxHeight, overflow: 'auto' }}
      onMouseLeave={() => setHoveredItem(null)}
    >
      <ItemTable
        items={displayedItems}
        setsData={setsData}
        craftingData={craftingData}
        stickyHeader
        renderNameExtra={(item) => {
          const isCurrent = currentItem?.name === item.name
          if (!isCurrent) return null
          return (
            <Tooltip title="Currently equipped">
              <CheckCircleIcon fontSize="small" color="success" />
            </Tooltip>
          )
        }}
        renderAction={(item) => {
          const isCurrent = currentItem?.name === item.name
          return (
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
          )
        }}
        rowProps={(item) => ({
          onMouseEnter: () => setHoveredItem(item),
          onClick: () => {
            if (currentItem?.name !== item.name) onSelect(item)
          },
          sx: {
            cursor: 'pointer',
            bgcolor: currentItem?.name === item.name ? 'action.selected' : undefined,
          },
        })}
        emptyContent={
          <Typography color="text.secondary">No items found</Typography>
        }
        footer={
          hasMore ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center' }}>
                <Button
                  size="small"
                  onClick={() => setDisplayLimit(prev => prev + 50)}
                >
                  Show more ({sortedItems.length - displayLimit} remaining)
                </Button>
              </TableCell>
            </TableRow>
          ) : undefined
        }
      />

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
    </Box>
  )
}
