import {
  Box,
  Chip,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import React from 'react'

import { Item, ItemAffix, SetsData } from '@/api/ddoGearPlanner'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { RaidNotes } from '@/domains/raids/raidNotes'

import ItemCraftingDisplay from './ItemCraftingDisplay'
import ItemSetTooltip from './ItemSetTooltip'

interface ItemTableRowProps {
  item: Item
  searchText: string
  setsData: SetsData | null
  raidNotes: RaidNotes | null
  highlightText: (text: string, query: string) => string | React.ReactElement
  formatAffix: (affix: ItemAffix, query?: string) => string | React.ReactElement
  getWikiUrl: (url: string | undefined) => string | null
  getAugmentColor: (text: string) => string | undefined
  getCraftingOptions: (craft: string) => string[]
}

export default function ItemTableRow({
  item,
  searchText,
  setsData,
  raidNotes,
  highlightText,
  formatAffix,
  getWikiUrl,
  getAugmentColor,
  getCraftingOptions
}: ItemTableRowProps) {
  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
  const wikiUrl = getWikiUrl(item.url)

  const augmentColor = item.slot === 'Augment' ? getAugmentColor(item.type || '') : undefined

  return (
    <TableRow key={itemKey} hover>
      <TableCell>{item.ml}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ color: augmentColor }}>
            {highlightText(item.name, searchText)}
          </Typography>
          {wikiUrl && <DdoWikiLink wikiUrl={wikiUrl} />}
        </Box>
        {item.slot && (item.slot === 'Weapon' || item.slot === 'Offhand') && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.slot}
          </Typography>
        )}
        {item.artifact && <Chip label="Artifact" size="small" color="secondary" variant="outlined" sx={{ mt: 0.5 }} />}
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
      <TableCell>{highlightText((item.slot && item.slot !== 'Weapon' && item.slot !== 'Offhand') ? (item.slot === 'Augment' ? `Augment (${item.type})` : item.slot) : (item.type || ''), searchText)}</TableCell>
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
    </TableRow>
  )
}
