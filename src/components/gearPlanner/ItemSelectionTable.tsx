import { useMemo, useState } from 'react'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import {
  Box,
  Button,
  Chip,
  Paper,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'

import { Item, ItemAffix, CraftingData, SetsData } from '@/api/ddoGearPlanner'
import ItemTable from '@/components/items/ItemTable'
import { formatAffix } from '@/utils/affixHelpers'
import InventoryBadge from './InventoryBadge'

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

function formatNumericDelta(value: number): string {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '')
  return value > 0 ? `+${rounded}` : rounded
}

function getAffixComparisonColor(affix: ItemAffix, comparedAffixes: ItemAffix[] | undefined): string {
  if (!comparedAffixes) return 'text.secondary'

  const matchingAffix = comparedAffixes.find(candidate => (
    candidate.name === affix.name && candidate.type === affix.type
  ))
  const diff = getAffixValue(affix) - (matchingAffix ? getAffixValue(matchingAffix) : 0)

  if (diff > 0) return 'success.main'
  if (diff < 0) return 'error.main'
  return 'text.secondary'
}

function ComparisonItemCard({
  title,
  description,
  item,
  comparedItem,
  emptyMessage,
}: {
  title: string
  description: string
  item: Item | null
  comparedItem?: Item | null
  emptyMessage?: string
}) {
  return (
    <Box
      sx={{
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        bgcolor: item ? 'background.paper' : 'action.hover'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        {item && <Chip label={`ML ${item.ml}`} size="small" variant="outlined" />}
      </Box>

      {item ? (
        <>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ minWidth: 0 }} title={item.name}>
              {item.name}
            </Typography>
            <InventoryBadge itemName={item.name} showBTC />
          </Box>

          <Box sx={{ mt: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
            {item.affixes.map((affix, index) => (
              <Typography
                key={`${item.name}-${affix.name}-${affix.type}-${index}`}
                variant="caption"
                display="block"
                sx={{
                  color: getAffixComparisonColor(affix, comparedItem?.affixes),
                  lineHeight: 1.4,
                }}
              >
                {formatAffix(affix)}
              </Typography>
            ))}
          </Box>
        </>
      ) : (
        <Box
          sx={{
            minHeight: 0,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

/** Side-by-side comparison panel for current vs preview item */
function ComparisonPanel({ currentItem, hoveredItem }: { currentItem: Item; hoveredItem: Item | null }) {
  const comparedItem = hoveredItem && hoveredItem.name !== currentItem.name ? hoveredItem : null
  const comparisonEntries = useMemo(() => {
    if (!comparedItem) return []

    const allProps = new Map<string, { current: ItemAffix[]; hovered: ItemAffix[] }>()

    for (const affix of currentItem.affixes) {
      if (!allProps.has(affix.name)) allProps.set(affix.name, { current: [], hovered: [] })
      allProps.get(affix.name)!.current.push(affix)
    }
    for (const affix of comparedItem.affixes) {
      if (!allProps.has(affix.name)) allProps.set(affix.name, { current: [], hovered: [] })
      allProps.get(affix.name)!.hovered.push(affix)
    }

    return Array.from(allProps.entries())
      .map(([name, groups]) => {
        const currentValue = groups.current.reduce((sum, affix) => sum + getAffixValue(affix), 0)
        const hoveredValue = groups.hovered.reduce((sum, affix) => sum + getAffixValue(affix), 0)

        return {
          name,
          currentValue,
          hoveredValue,
          diff: hoveredValue - currentValue,
        }
      })
      .filter(entry => entry.diff !== 0)
      .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff) || left.name.localeCompare(right.name))
  }, [comparedItem, currentItem.affixes])

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 1.5,
        height: { xs: 360, sm: 270 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="subtitle2">Item Comparison</Typography>
          <Typography variant="body2" color="text.secondary">
            Hover the list to preview changes, then select the item you want to equip.
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          color={comparedItem ? 'primary' : 'default'}
          label={comparedItem ? `${comparisonEntries.length} changes tracked` : 'Hover an item to preview it'}
        />
      </Box>

      <Box
        sx={{
          minHeight: 0,
          flex: 1,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <ComparisonItemCard
          title="Current"
          description="Equipped in this slot"
          item={currentItem}
          comparedItem={comparedItem}
        />
        <ComparisonItemCard
          title="Preview"
          description={comparedItem ? 'Last hovered result' : 'Move through the table to compare'}
          item={comparedItem}
          comparedItem={currentItem}
          emptyMessage="Hover an item in the table to preview it here without shifting the dialog."
        />
      </Box>

      <Box
        sx={{
          minHeight: 40,
          maxHeight: 64,
          overflow: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.75,
          alignContent: 'flex-start',
        }}
      >
        {!comparedItem && (
          <Typography variant="caption" color="text.secondary">
            The preview area stays fixed so you can compare long property lists without the table jumping.
          </Typography>
        )}
        {comparedItem && comparisonEntries.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No net property differences between these two items.
          </Typography>
        )}
        {comparisonEntries.map((entry) => {
          const isGain = entry.diff > 0
          const isNewProperty = entry.currentValue === 0 && entry.hoveredValue > 0
          const isRemovedProperty = entry.hoveredValue === 0 && entry.currentValue > 0
          const label = isNewProperty
            ? `Gains ${entry.name}`
            : isRemovedProperty
              ? `Loses ${entry.name}`
              : `${entry.name} ${formatNumericDelta(entry.diff)}`

          return (
            <Chip
              key={entry.name}
              label={label}
              size="small"
              variant="outlined"
              sx={{
                color: isGain ? 'success.main' : 'error.main',
                borderColor: isGain ? 'success.main' : 'error.main',
                bgcolor: isGain ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)',
              }}
            />
          )
        })}
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

  // Sort items by ML (desc) or keep original order
  const sortedItems = useMemo(() => (
    sortByML
      ? [...items].sort((a, b) => {
        if (a.ml !== b.ml) return b.ml - a.ml
        return a.name.localeCompare(b.name)
      })
      : items
  ), [items, sortByML])

  // Limit displayed items
  const displayedItems = sortedItems.slice(0, displayLimit)
  const hasMore = sortedItems.length > displayLimit

  return (
    <Box>
      {/* Comparison panel above the table */}
      {currentItem && (
        <ComparisonPanel currentItem={currentItem} hoveredItem={hoveredItem} />
      )}

      <Box sx={{ maxHeight, overflow: 'auto' }}>
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
