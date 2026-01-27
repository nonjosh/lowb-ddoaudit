import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchQuestsById, Quest } from '@/api/ddoAudit'
import { Item, SetsData } from '@/api/ddoGearPlanner'
import ItemCraftingDisplay from '@/components/items/ItemCraftingDisplay'
import ItemSetTooltip from '@/components/items/ItemSetTooltip'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useWishlist, WishlistEntry } from '@/contexts/useWishlist'
import { formatAffix, formatAffixPlain, getAugmentColor, getWikiUrl, AffixLike } from '@/utils/affixHelpers'

type GroupingMode = 'none' | 'quest' | 'pack'

interface GroupedItems {
  key: string
  label: string
  items: Item[]
}

// Convert WishlistEntry to Item for display
function entryToItem(entry: WishlistEntry): Item {
  return {
    name: entry.name,
    ml: entry.ml,
    slot: entry.slot,
    type: entry.type,
    quests: entry.quests,
    url: entry.url,
    affixes: entry.affixes || [],
    crafting: entry.crafting,
    sets: entry.sets,
    artifact: entry.artifact,
  }
}

interface WishlistItemRowProps {
  item: Item
  setsData: SetsData | null
  onRemove: () => void
  getCraftingOptions: (craft: string) => string[]
}

function WishlistItemRow({ item, setsData, onRemove, getCraftingOptions }: WishlistItemRowProps) {
  const wikiUrl = getWikiUrl(item.url)
  const augmentColor = item.slot === 'Augment' ? getAugmentColor(item.type || '') : undefined

  return (
    <TableRow hover>
      <TableCell>{item.ml}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight="bold" sx={{ color: augmentColor }}>
            {item.name}
          </Typography>
          <IconButton
            size="small"
            onClick={onRemove}
            aria-label="remove from wish list"
            sx={{ p: 0.25, color: 'error.main' }}
          >
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
          {wikiUrl && <DdoWikiLink wikiUrl={wikiUrl} />}
        </Box>
        {item.slot && (item.slot === 'Weapon' || item.slot === 'Offhand') && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.slot}
          </Typography>
        )}
        {item.artifact && <Chip label="Artifact" size="small" color="secondary" variant="outlined" sx={{ mt: 0.5 }} />}
      </TableCell>
      <TableCell>
        {(item.slot && item.slot !== 'Weapon' && item.slot !== 'Offhand')
          ? (item.slot === 'Augment' ? `Augment (${item.type})` : item.slot)
          : (item.type || '—')}
      </TableCell>
      <TableCell>
        {item.affixes && item.affixes.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {item.affixes.map((affix, idx) => (
              <li key={idx}>
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {formatAffix(affix)}
                </Typography>
              </li>
            ))}
            {item.sets?.[0] && (
              <li>
                <ItemSetTooltip setName={item.sets[0]} setsData={setsData} formatAffix={formatAffix} />
              </li>
            )}
          </ul>
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
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

interface CollapsibleGroupProps {
  group: GroupedItems
  setsData: SetsData | null
  onRemove: (key: string) => void
  getCraftingOptions: (craft: string) => string[]
  defaultExpanded?: boolean
}

function CollapsibleGroup({ group, setsData, onRemove, getCraftingOptions, defaultExpanded = true }: CollapsibleGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <>
      <TableRow
        onClick={() => setExpanded(!expanded)}
        sx={{ cursor: 'pointer', bgcolor: 'action.hover' }}
      >
        <TableCell colSpan={5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            <Typography variant="subtitle2" fontWeight="bold">
              {group.label}
            </Typography>
            <Chip size="small" label={group.items.length} />
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {group.items.map((item) => {
                  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
                  return (
                    <WishlistItemRow
                      key={itemKey}
                      item={item}
                      setsData={setsData}
                      onRemove={() => {
                        // Build the wishlist key
                        const key = `${item.name.trim().toLowerCase()}__${item.ml}__${item.slot.trim().toLowerCase()}__${(item.type || '').trim().toLowerCase()}`
                        onRemove(key)
                      }}
                      getCraftingOptions={getCraftingOptions}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function Wishlist() {
  const { entriesByKey, keys, removeWish, clearAll } = useWishlist()
  const { craftingData, setsData, loading, refresh, error } = useGearPlanner()

  const [groupingMode, setGroupingMode] = useState<GroupingMode>('none')
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})

  useEffect(() => {
    fetchQuestsById().then(setQuestsById).catch(console.error)
  }, [])

  useEffect(() => {
    if (!craftingData && !loading && !error) {
      void refresh(false)
    }
  }, [craftingData, loading, error, refresh])

  const questNameToPack = useMemo(() => {
    const map = new Map<string, string>()
    Object.values(questsById).forEach(q => {
      if (q.name && q.required_adventure_pack) {
        map.set(q.name, q.required_adventure_pack)
      }
    })
    return map
  }, [questsById])

  const entries = useMemo(() => {
    return keys.map((k) => entriesByKey[k]).filter(Boolean)
  }, [entriesByKey, keys])

  const items = useMemo(() => entries.map(entryToItem), [entries])

  const getCraftingOptions = useCallback((craft: string) => {
    if (!craftingData) return []
    const data = craftingData
    if (data[craft] && data[craft]["*"]) {
      const craftItems = data[craft]["*"]
      if (craftItems.length > 0 && craftItems[0].affixes) {
        const affixMap = new Map<string, AffixLike>()
        craftItems.forEach((item) => {
          if (item.affixes) {
            item.affixes.forEach(affix => {
              const key = `${affix.name}-${affix.type}`
              const existing = affixMap.get(key)
              const currentValue = typeof affix.value === 'string' ? parseFloat(affix.value) : (affix.value ?? 0)
              const existingValue = existing && existing.value
                ? (typeof existing.value === 'string' ? parseFloat(existing.value) : existing.value)
                : 0
              if (!existing || currentValue > existingValue) {
                affixMap.set(key, { name: affix.name, type: affix.type, value: affix.value })
              }
            })
          }
        })
        return Array.from(affixMap.values()).map(affix => formatAffixPlain(affix))
      } else {
        return craftItems.map((item) => item.name ?? '')
      }
    } else if (data[craft]) {
      const options: string[] = []
      for (const [itemName, sets] of Object.entries(data[craft])) {
        if (!Array.isArray(sets)) continue
        options.push(`${itemName}:`)
        sets.forEach((set) => {
          options.push(`- ${set.name ?? ''}`)
        })
      }
      return options
    }
    return []
  }, [craftingData])

  // Group items based on grouping mode
  const groupedItems = useMemo((): GroupedItems[] => {
    if (groupingMode === 'none') {
      return [{ key: 'all', label: 'All Items', items }]
    }

    const groups = new Map<string, Item[]>()
    const noGroupKey = groupingMode === 'quest' ? 'No Quest' : 'No Pack'

    items.forEach(item => {
      if (!item.quests || item.quests.length === 0) {
        const existing = groups.get(noGroupKey) || []
        existing.push(item)
        groups.set(noGroupKey, existing)
        return
      }

      if (groupingMode === 'quest') {
        // Group by each quest the item drops from
        item.quests.forEach(questName => {
          const existing = groups.get(questName) || []
          existing.push(item)
          groups.set(questName, existing)
        })
      } else {
        // Group by adventure pack
        const packs = new Set<string>()
        item.quests.forEach(questName => {
          const pack = questNameToPack.get(questName)
          if (pack) {
            packs.add(pack)
          }
        })
        if (packs.size === 0) {
          const existing = groups.get(noGroupKey) || []
          existing.push(item)
          groups.set(noGroupKey, existing)
        } else {
          packs.forEach(pack => {
            const existing = groups.get(pack) || []
            existing.push(item)
            groups.set(pack, existing)
          })
        }
      }
    })

    // Sort groups alphabetically, but put "No Quest" / "No Pack" at the end
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === noGroupKey) return 1
      if (b === noGroupKey) return -1
      return a.localeCompare(b)
    })

    return sortedKeys.map(key => ({
      key,
      label: key,
      items: groups.get(key) || []
    }))
  }, [items, groupingMode, questNameToPack])

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ mb: 0 }}>
          Wish List
        </Typography>
        <Chip size="small" variant="outlined" label={entries.length} />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Group By</InputLabel>
          <Select
            value={groupingMode}
            label="Group By"
            onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="quest">Quest</MenuItem>
            <MenuItem value="pack">Adventure Pack</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<DeleteSweepIcon />}
            disabled={entries.length === 0}
            onClick={() => {
              if (window.confirm('Clear all items from your wish list?')) {
                clearAll()
              }
            }}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {!entries.length ? (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Your wish list is empty. Add items using the heart button in quest loot or the Item Wiki.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="wish list table">
            <TableHead>
              <TableRow>
                <TableCell width={60}>ML</TableCell>
                <TableCell width={250}>Name</TableCell>
                <TableCell width={150}>Type</TableCell>
                <TableCell>Properties</TableCell>
                <TableCell width={200}>Augments/Crafting</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupingMode === 'none' ? (
                // Flat list
                items.map((item) => {
                  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
                  return (
                    <WishlistItemRow
                      key={itemKey}
                      item={item}
                      setsData={setsData}
                      onRemove={() => {
                        const key = `${item.name.trim().toLowerCase()}__${item.ml}__${item.slot.trim().toLowerCase()}__${(item.type || '').trim().toLowerCase()}`
                        removeWish(key)
                      }}
                      getCraftingOptions={getCraftingOptions}
                    />
                  )
                })
              ) : (
                // Grouped list
                groupedItems.map((group) => (
                  <CollapsibleGroup
                    key={group.key}
                    group={group}
                    setsData={setsData}
                    onRemove={removeWish}
                    getCraftingOptions={getCraftingOptions}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
