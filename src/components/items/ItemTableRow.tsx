import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import {
  Box,
  Chip,
  IconButton,
  Link,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import IconWrapper from "@/components/shared/IconWrapper"
import type React from 'react'
import type { SxProps, Theme } from '@mui/material'
import { useCallback } from 'react'

import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import InventoryBadge from '@/components/gearPlanner/InventoryBadge'
import { artifactTableRowSx } from '@/components/shared/artifactStyles'
import { useWishlist } from '@/contexts/useWishlist'
import { isRaidItem } from '@/domains/quests/questHelpers'
import { RaidNotes } from '@/domains/raids/raidNotes'
import { useRaidQuestNames } from '@/hooks/useRaidQuestNames'
import { formatAffix, getAugmentColor, getCraftingOptionsForSlot, getWikiUrl, highlightText } from '@/utils/affixHelpers'

import ItemCraftingDisplay from './ItemCraftingDisplay'
import ItemSetTooltip from './ItemSetTooltip'

interface ItemTableRowProps {
  item: Item
  searchText?: string
  setsData?: SetsData | null
  raidNotes?: RaidNotes | null
  craftingData?: CraftingData | null
  /** Optional action column rendered at the end of the row */
  renderAction?: (item: Item) => React.ReactNode
  /** Hide the "Raid" tag (e.g. when all items are already known to be from a raid) */
  hideRaidTag?: boolean
  /** Show the wishlist heart toggle next to the item name (default: true) */
  showWishlistToggle?: boolean
  /** Extra content rendered next to the item name (e.g. delete button) */
  renderNameExtra?: (item: Item) => React.ReactNode
  /** Custom props spread onto the TableRow (e.g. onClick, onMouseEnter, sx) */
  rowProps?: { onClick?: React.MouseEventHandler; onMouseEnter?: React.MouseEventHandler; sx?: SxProps<Theme> }
}

export default function ItemTableRow({
  item,
  searchText = '',
  setsData = null,
  raidNotes = null,
  craftingData = null,
  renderAction,
  hideRaidTag = false,
  showWishlistToggle = true,
  renderNameExtra,
  rowProps,
}: ItemTableRowProps) {
  const { isWished, toggleWish } = useWishlist()
  const raidQuestNames = useRaidQuestNames()

  const getCraftingOptions = useCallback(
    (craft: string) => getCraftingOptionsForSlot(craft, craftingData),
    [craftingData],
  )

  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
  const wikiUrl = getWikiUrl(item.url) ||
    (item.slot === 'Augment' ? `https://ddowiki.com/page/Item:${item.name.replace(/\s+/g, '_')}` : null)

  const wished = isWished(item)

  const augmentColor = item.slot === 'Augment' ? getAugmentColor(item.type || '') : undefined

  return (
    <TableRow
      key={itemKey}
      hover
      sx={{ ...(item.artifact ? artifactTableRowSx : undefined), ...rowProps?.sx as Record<string, unknown> }}
      onClick={rowProps?.onClick}
      onMouseEnter={rowProps?.onMouseEnter}
    >
      <TableCell>{item.ml}</TableCell>
      <TableCell>
        <Box sx={{ alignItems: 'center', display: 'inline-flex', gap: 0.5 }}>
          {wikiUrl ? (
            <Link
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{
                color: augmentColor || 'text.primary',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline', color: 'primary.main' },
              }}
            >
              {highlightText(item.name, searchText)}
            </Link>
          ) : (
            <Typography variant="body2" fontWeight="bold" sx={{ color: augmentColor }}>
              {highlightText(item.name, searchText)}
            </Typography>
          )}
          <InventoryBadge itemName={item.name} />
          {showWishlistToggle && (
            <Tooltip title={wished ? 'Remove from wish list' : 'Add to wish list'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleWish(item)
                }}
                aria-label={wished ? 'remove from wish list' : 'add to wish list'}
                sx={{ p: 0.25 }}
              >
                <IconWrapper>
                  {wished ? (
                    <FavoriteIcon sx={{ color: 'error.main' }} />
                  ) : (
                    <FavoriteBorderIcon />
                  )}
                </IconWrapper>
              </IconButton>
            </Tooltip>
          )}
          {renderNameExtra?.(item)}
        </Box>
        {item.slot && (item.slot === 'Weapon' || item.slot === 'Offhand') && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.slot}
          </Typography>
        )}
        {!hideRaidTag && isRaidItem(item, raidQuestNames) && (
          <Box>
            <Chip label="Raid" size="small" color="error" variant="outlined" sx={{ mt: 0.5 }} />
          </Box>
        )}
        {(() => {
          const augmentMatch = raidNotes?.augments.find(augment => augment.includes(item.name))
          return augmentMatch ? (
            <Tooltip title={augmentMatch.split(':').pop()?.trim()}>
              <Chip label="Soulforge" size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
            </Tooltip>
          ) : null
        })()}
        {(() => {
          const setMatch = raidNotes?.sets.find(set => set.includes(item.name))
          return setMatch ? (
            <Tooltip title={setMatch.split(':').pop()?.trim()}>
              <Chip label="Set Augment" size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} />
            </Tooltip>
          ) : null
        })()}
      </TableCell>
      <TableCell>{highlightText((item.slot && item.slot !== 'Weapon' && item.slot !== 'Offhand') ? (item.slot === 'Augment' ? `Augment (${item.type})` : (item.slot === 'Armor' && item.type ? item.type : item.slot)) : (item.type || ''), searchText)}</TableCell>
      <TableCell>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {item.affixes.map((affix, idx) => (
            <li key={idx}>
              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                {formatAffix(affix, searchText)}
              </Typography>
            </li>
          ))}
          {item.sets?.[0] && (
            <li>
              <ItemSetTooltip setName={item.sets[0]} setsData={setsData} formatAffix={formatAffix} />
            </li>
          )}
        </ul>
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
      {renderAction && (
        <TableCell align="center">
          {renderAction(item)}
        </TableCell>
      )}
    </TableRow>
  )
}
