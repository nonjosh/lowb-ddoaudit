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
      return { ingredient, required, available }
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

function IngredientProgressRow({ ingredient, required, available }: IngredientRowData) {
  const percentage = Math.min(100, (available / required) * 100)
  const sufficient = available >= required

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.25,
          }}
        >
          <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem' }}>
            {ingredient}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 1 }}>
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
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={sufficient ? 'success' : 'warning'}
          sx={{ height: 6, borderRadius: 1 }}
        />
      </Box>
    </Box>
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
