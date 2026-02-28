import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import {
  Box,
  Chip,
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import type React from 'react'
import { useCallback } from 'react'

import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import InventoryBadge from '@/components/gearPlanner/InventoryBadge'
import { artifactTableRowSx } from '@/components/shared/artifactStyles'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
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
}

export default function ItemTableRow({
  item,
  searchText = '',
  setsData = null,
  raidNotes = null,
  craftingData = null,
  renderAction,
}: ItemTableRowProps) {
  const { isWished, toggleWish } = useWishlist()
  const raidQuestNames = useRaidQuestNames()

  const getCraftingOptions = useCallback(
    (craft: string) => getCraftingOptionsForSlot(craft, craftingData),
    [craftingData],
  )

  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
  const wikiUrl = getWikiUrl(item.url)

  const wished = isWished(item)

  const augmentColor = item.slot === 'Augment' ? getAugmentColor(item.type || '') : undefined

  return (
    <TableRow key={itemKey} hover sx={item.artifact ? artifactTableRowSx : undefined}>
      <TableCell>{item.ml}</TableCell>
      <TableCell>
        <Box sx={{ alignItems: 'center', display: 'inline-flex', gap: 0.5 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ color: augmentColor }}>
            {highlightText(item.name, searchText)}
          </Typography>
          <InventoryBadge itemName={item.name} />
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
              {wished ? (
                <FavoriteIcon fontSize="small" sx={{ color: 'error.main' }} />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          {wikiUrl && <DdoWikiLink wikiUrl={wikiUrl} />}
        </Box>
        {item.slot && (item.slot === 'Weapon' || item.slot === 'Offhand') && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.slot}
          </Typography>
        )}
        {isRaidItem(item, raidQuestNames) && (
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
