import {
  Box,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'

import type { TroveItemLocation } from '@/api/trove/types'
import { getIngredientFallbackPath, getIngredientImagePath } from '@/utils/craftingHelpers'

// ============================================================================
// Types
// ============================================================================

export interface IngredientGroup {
  label: string
  filter: (ingredient: string) => boolean
}

interface IngredientProgressListProps {
  summary: Record<string, number>
  inventoryMap: Map<string, TroveItemLocation[]>
  /** Optional groups for sectioning ingredients (e.g. Heroic / Legendary) */
  groups?: IngredientGroup[]
  /** Whether to sort ingredients alphabetically (default: preserve order) */
  sortAlphabetically?: boolean
}

interface IngredientRowData {
  ingredient: string
  required: number
  available: number
  locations: TroveItemLocation[]
}

// ============================================================================
// Main Component
// ============================================================================

export default function IngredientProgressList({
  summary,
  inventoryMap,
  groups,
  sortAlphabetically = false,
}: IngredientProgressListProps) {
  const hasTrove = inventoryMap.size > 0

  const allRows = useMemo(() => {
    let ingredients = Object.keys(summary).filter((k) => summary[k] > 0)
    if (sortAlphabetically) ingredients = ingredients.sort()

    return ingredients.map((ingredient) => {
      const required = summary[ingredient]
      const locations = inventoryMap.get(ingredient) ?? []
      const available = locations.reduce((sum, loc) => sum + (loc.quantity ?? 0), 0)
      return { ingredient, required, available, locations }
    })
  }, [summary, inventoryMap, sortAlphabetically])

  if (hasTrove) {
    return <ProgressBarView rows={allRows} groups={groups} />
  }
  return <TableView rows={allRows} groups={groups} />
}

// ============================================================================
// Progress Bar View (when Trove data is loaded)
// ============================================================================

function ProgressBarView({
  rows,
  groups,
}: {
  rows: IngredientRowData[]
  groups?: IngredientGroup[]
}) {
  if (groups) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groups.map((group) => {
          const groupRows = rows.filter((r) => group.filter(r.ingredient))
          if (groupRows.length === 0) return null
          return (
            <Box key={group.label}>
              <Typography
                variant="caption"
                fontWeight="bold"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                {group.label}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {groupRows.map((row) => (
                  <IngredientProgressRow key={row.ingredient} {...row} />
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {rows.map((row) => (
        <IngredientProgressRow key={row.ingredient} {...row} />
      ))}
    </Box>
  )
}

function IngredientProgressRow({ ingredient, required, available, locations }: IngredientRowData) {
  const percentage = Math.min(100, (available / required) * 100)
  const sufficient = available >= required

  // Build tooltip content showing per-location breakdown
  const tooltipContent = useMemo(() => {
    if (locations.length === 0) return 'No items found in Trove data'

    // Group quantities by location label
    const grouped = new Map<string, number>()
    for (const loc of locations) {
      let label: string
      if (loc.container === 'CraftingStorage') {
        label = 'Crafting Storage'
      } else if (loc.container === 'SharedBank') {
        label = `Shared Bank${loc.tabName ? ` (${loc.tabName})` : ''}`
      } else if (loc.container === 'Bank') {
        label = `${loc.characterName} - Bank${loc.tabName ? ` (${loc.tabName})` : ''}`
      } else if (loc.container === 'Equipped') {
        label = `${loc.characterName} (Equipped)`
      } else {
        label = `${loc.characterName} - ${loc.container}`
      }
      grouped.set(label, (grouped.get(label) ?? 0) + (loc.quantity ?? 0))
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, qty]) => `${qty}× ${label}`)
      .join('\n')
  }, [locations])

  return (
    <Tooltip
      title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipContent}</span>}
      arrow
      placement="top"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <img
          src={getIngredientImagePath(ingredient)}
          alt=""
          width={24}
          height={24}
          style={{ imageRendering: 'pixelated', flexShrink: 0 }}
          onError={(e) => {
            ; (e.target as HTMLImageElement).src = getIngredientFallbackPath()
          }}
        />
        <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem', flexShrink: 0 }}>
          {ingredient}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={sufficient ? 'success' : 'warning'}
          sx={{ flex: 1, height: 6, borderRadius: 1, minWidth: 40 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 0.5 }}>
          <Typography
            variant="caption"
            color={sufficient ? 'success.main' : 'warning.main'}
            fontWeight="bold"
          >
            {available} / {required}
          </Typography>
          {sufficient ? (
            <Chip
              label="OK"
              size="small"
              color="success"
              sx={{
                height: 18,
                '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' },
              }}
            />
          ) : (
            <Chip
              label={`-${required - available}`}
              size="small"
              color="warning"
              sx={{
                height: 18,
                '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' },
              }}
            />
          )}
        </Box>
      </Box>
    </Tooltip>
  )
}

// ============================================================================
// Table View (no Trove data)
// ============================================================================

function TableView({
  rows,
  groups,
}: {
  rows: IngredientRowData[]
  groups?: IngredientGroup[]
}) {
  if (groups) {
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ingredient</TableCell>
              <TableCell align="right">Required</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => {
              const groupRows = rows.filter((r) => group.filter(r.ingredient))
              if (groupRows.length === 0) return null
              return [
                <TableRow key={`__group__${group.label}`}>
                  <TableCell
                    colSpan={2}
                    sx={{ bgcolor: 'action.hover', fontWeight: 'bold' }}
                  >
                    {group.label}
                  </TableCell>
                </TableRow>,
                ...groupRows.map((row) => (
                  <IngredientTableRow key={row.ingredient} {...row} />
                )),
              ]
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ingredient</TableCell>
            <TableCell align="right">Required</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <IngredientTableRow key={row.ingredient} {...row} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function IngredientTableRow({ ingredient, required }: IngredientRowData) {
  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <img
            src={getIngredientImagePath(ingredient)}
            alt=""
            width={20}
            height={20}
            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
            onError={(e) => {
              ; (e.target as HTMLImageElement).src = getIngredientFallbackPath()
            }}
          />
          {ingredient}
        </Box>
      </TableCell>
      <TableCell align="right">
        <Typography fontWeight="bold">{required}</Typography>
      </TableCell>
    </TableRow>
  )
}
