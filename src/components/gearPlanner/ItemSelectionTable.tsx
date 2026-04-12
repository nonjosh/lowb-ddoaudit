import { useState } from 'react'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import {
  Box,
  Button,
  Divider,
  Paper,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'

import { Item, ItemAffix, CraftingData, SetsData } from '@/api/ddoGearPlanner'
import ItemTable from '@/components/items/ItemTable'
import { formatAffix } from '@/utils/affixHelpers'

interface ItemSelectionTableProps {
  items: Item[]
  currentItem?: Item
  onSelect: (item: Item) => void
  maxHeight?: number
  sortByML?: boolean
  craftingData?: CraftingData | null
  setsData?: SetsData | null
}

function getAffixValue(affix: ItemAffix): number {
  if (typeof affix.value === 'number') return affix.value
  if (typeof affix.value === 'string') {
    const parsed = parseFloat(affix.value)
    return isNaN(parsed) ? 0 : parsed
  }
  return affix.type === 'bool' ? 1 : 0
}

/** Side-by-side comparison panel for current vs hovered item */
function ComparisonPanel({ currentItem, hoveredItem }: { currentItem: Item; hoveredItem: Item }) {
  // Collect all properties from both items, grouped by property name
  const allProps = new Map<string, { current: ItemAffix[]; hovered: ItemAffix[] }>()

  for (const affix of currentItem.affixes) {
    if (!allProps.has(affix.name)) allProps.set(affix.name, { current: [], hovered: [] })
    allProps.get(affix.name)!.current.push(affix)
  }
  for (const affix of hoveredItem.affixes) {
    if (!allProps.has(affix.name)) allProps.set(affix.name, { current: [], hovered: [] })
    allProps.get(affix.name)!.hovered.push(affix)
  }

  const sortedProps = Array.from(allProps.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  // Compute total value diffs
  const diffs: Array<{ name: string; diff: number }> = []
  for (const [name, { current, hovered }] of sortedProps) {
    const curVal = current.reduce((s, a) => s + getAffixValue(a), 0)
    const hovVal = hovered.reduce((s, a) => s + getAffixValue(a), 0)
    const diff = hovVal - curVal
    if (diff !== 0) diffs.push({ name, diff })
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Current item */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Current
          </Typography>
          <Typography variant="subtitle2" noWrap title={currentItem.name}>
            {currentItem.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">ML {currentItem.ml}</Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Hovered item */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Hovered
          </Typography>
          <Typography variant="subtitle2" noWrap title={hoveredItem.name}>
            {hoveredItem.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">ML {hoveredItem.ml}</Typography>
        </Box>
      </Box>

      {/* Property diffs */}
      {diffs.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {diffs.map(({ name, diff }) => (
            <Typography
              key={name}
              variant="caption"
              sx={{
                color: diff > 0 ? 'success.main' : 'error.main',
                fontWeight: 'bold',
                bgcolor: diff > 0 ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5
              }}
            >
              {name}: {diff > 0 ? '+' : ''}{diff}
            </Typography>
          ))}
        </Box>
      )}

      {/* Detailed affix comparison */}
      <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {currentItem.affixes.map((affix, idx) => {
            // Check if hovered item has a better or worse version
            const hoveredMatch = hoveredItem.affixes.find(a => a.name === affix.name && a.type === affix.type)
            const diff = hoveredMatch ? getAffixValue(hoveredMatch) - getAffixValue(affix) : -getAffixValue(affix)
            return (
              <Typography
                key={idx}
                variant="caption"
                display="block"
                sx={{
                  color: diff > 0 ? 'error.main' : diff < 0 ? 'success.main' : 'text.secondary',
                  fontSize: '0.65rem',
                  lineHeight: 1.3
                }}
              >
                {formatAffix(affix)}
              </Typography>
            )
          })}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {hoveredItem.affixes.map((affix, idx) => {
            const currentMatch = currentItem.affixes.find(a => a.name === affix.name && a.type === affix.type)
            const diff = getAffixValue(affix) - (currentMatch ? getAffixValue(currentMatch) : 0)
            return (
              <Typography
                key={idx}
                variant="caption"
                display="block"
                sx={{
                  color: diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary',
                  fontSize: '0.65rem',
                  lineHeight: 1.3
                }}
              >
                {formatAffix(affix)}
              </Typography>
            )
          })}
        </Box>
      </Box>
    </Paper>
  )
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

  // Limit displayed items
  const displayedItems = sortedItems.slice(0, displayLimit)
  const hasMore = sortedItems.length > displayLimit

  return (
    <Box>
      {/* Comparison panel above the table */}
      {hoveredItem && currentItem && hoveredItem.name !== currentItem.name && (
        <ComparisonPanel currentItem={currentItem} hoveredItem={hoveredItem} />
      )}

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
      </Box>
    </Box>
  )
}
