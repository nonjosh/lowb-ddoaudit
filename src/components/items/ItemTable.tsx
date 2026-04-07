import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import type React from 'react'

import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import { RaidNotes } from '@/domains/raids/raidNotes'

import ItemTableRow from './ItemTableRow'
import { ITEM_TABLE_COLUMN_WIDTHS } from './itemTableConstants'

interface ItemTableProps {
  items: Item[]
  setsData?: SetsData | null
  craftingData?: CraftingData | null
  raidNotes?: RaidNotes | null
  searchText?: string
  hideRaidTag?: boolean
  showWishlistToggle?: boolean
  renderAction?: (item: Item) => React.ReactNode
  renderNameExtra?: (item: Item) => React.ReactNode
  /** Content shown when items array is empty */
  emptyContent?: React.ReactNode
  /** Use MUI stickyHeader on the Table */
  stickyHeader?: boolean
  /** Use fixed table layout with colgroup */
  fixedLayout?: boolean
  /** Custom sx for the TableHead */
  headerSx?: SxProps<Theme>
  /** Extra rows rendered at the end of TableBody (e.g. truncation notice) */
  footer?: React.ReactNode
  /** Per-row custom props (e.g. onClick, onMouseEnter, sx) */
  rowProps?: (item: Item) => { onClick?: React.MouseEventHandler; onMouseEnter?: React.MouseEventHandler; sx?: SxProps<Theme> }
}

export default function ItemTable({
  items,
  setsData,
  craftingData,
  raidNotes,
  searchText,
  hideRaidTag,
  showWishlistToggle,
  renderAction,
  renderNameExtra,
  emptyContent,
  stickyHeader = false,
  fixedLayout = false,
  headerSx,
  footer,
  rowProps,
}: ItemTableProps) {
  const hasActionColumn = !!renderAction
  const colSpan = hasActionColumn ? 6 : 5

  return (
    <Table size="small" stickyHeader={stickyHeader} sx={fixedLayout ? { tableLayout: 'fixed' } : undefined}>
      {fixedLayout && (
        <colgroup>
          <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.ml }} />
          <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.name }} />
          <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.type }} />
          <col />
          <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.augments }} />
          {hasActionColumn && <col />}
        </colgroup>
      )}
      <TableHead sx={headerSx}>
        <TableRow>
          <TableCell width={fixedLayout ? undefined : 60}>ML</TableCell>
          <TableCell width={fixedLayout ? undefined : 250}>Name</TableCell>
          <TableCell width={fixedLayout ? undefined : 150}>Type</TableCell>
          <TableCell>Properties</TableCell>
          <TableCell width={fixedLayout ? undefined : 200}>Augments/Crafting</TableCell>
          {hasActionColumn && <TableCell align="center"></TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} sx={{ textAlign: 'center' }}>
              {emptyContent ?? (
                <Typography variant="body2" color="text.secondary">
                  No items found.
                </Typography>
              )}
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <ItemTableRow
              key={`${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`}
              item={item}
              searchText={searchText}
              setsData={setsData}
              raidNotes={raidNotes}
              craftingData={craftingData}
              hideRaidTag={hideRaidTag}
              showWishlistToggle={showWishlistToggle}
              renderAction={renderAction}
              renderNameExtra={renderNameExtra}
              rowProps={rowProps?.(item)}
            />
          ))
        )}
        {footer}
      </TableBody>
    </Table>
  )
}
