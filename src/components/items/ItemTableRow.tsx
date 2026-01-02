import { Item, ItemAffix } from '@/api/ddoGearPlanner'
import { RaidNotes } from '@/domains/raids/raidNotes'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Chip,
  Link,
  TableCell,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material'
import React from 'react'
import ItemCraftingDisplay from './ItemCraftingDisplay'
import ItemSetTooltip from './ItemSetTooltip'

interface ItemTableRowProps {
  item: Item
  searchText: string
  setsData: any
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

  return (
    <TableRow key={itemKey} hover>
      <TableCell>{item.ml}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight="bold">
            {highlightText(item.name, searchText)}
          </Typography>
          {wikiUrl && (
            <Tooltip title="Open in DDO Wiki">
              <Link
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </Link>
            </Tooltip>
          )}
        </Box>
        {item.slot && (item.slot === 'Weapon' || item.slot === 'Offhand') && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.slot}
          </Typography>
        )}
        {item.artifact && <Chip label="Artifact" size="small" color="secondary" variant="outlined" sx={{ mt: 0.5 }} />}
        {raidNotes?.augments.some(augment => augment.includes(item.name)) && (
          <Chip label="Soulforge" size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
        )}
        {raidNotes?.sets.some(set => set.includes(item.name)) && (
          <Chip label="Set Augment" size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} />
        )}
      </TableCell>
      <TableCell>{highlightText((item.slot && item.slot !== 'Weapon' && item.slot !== 'Offhand') ? item.slot : (item.type || ''), searchText)}</TableCell>
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