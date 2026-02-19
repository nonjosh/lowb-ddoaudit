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
  Link,
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
import { artifactTableRowSx } from '@/components/shared/artifactStyles'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useWishlist, WishlistEntry } from '@/contexts/useWishlist'
import { formatAffix, formatAffixPlain, getAugmentColor, getWikiUrl, AffixLike } from '@/utils/affixHelpers'

type GroupingMode = 'none' | 'quest' | 'pack'

interface GroupedItems {
  key: string
  label: string
  items: Item[]
}

const WISHLIST_COLUMN_WIDTHS = {
  ml: '60px',
  name: '250px',
  type: '150px',
  augments: '200px',
}

function WishlistTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: WISHLIST_COLUMN_WIDTHS.ml }} />
      <col style={{ width: WISHLIST_COLUMN_WIDTHS.name }} />
      <col style={{ width: WISHLIST_COLUMN_WIDTHS.type }} />
      <col />
      <col style={{ width: WISHLIST_COLUMN_WIDTHS.augments }} />
    </colgroup>
  )
}

function normalizeKeyPart(value: string | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function buildWishlistItemKey(name: string, ml: number, slot?: string, type?: string): string {
  return `${normalizeKeyPart(name)}__${ml}__${normalizeKeyPart(slot)}__${normalizeKeyPart(type)}`
}

function buildWishlistAugmentKey(name: string, ml: number): string {
  return `augment__${normalizeKeyPart(name)}__${ml}`
}

// Convert WishlistEntry to Item for display
function entryToItem(entry: WishlistEntry, matchedItem?: Item): Item {
  const slot = entry.slot ?? matchedItem?.slot ?? 'Augment'

  return {
    name: entry.name,
    ml: entry.ml,
    slot,
    type: entry.type ?? matchedItem?.type,
    quests: entry.quests ?? matchedItem?.quests,
    url: entry.url ?? matchedItem?.url,
    affixes: entry.affixes ?? matchedItem?.affixes ?? [],
    crafting: entry.crafting ?? matchedItem?.crafting,
    sets: entry.sets ?? matchedItem?.sets,
    artifact: entry.artifact ?? matchedItem?.artifact,
  }
}

interface WishlistItemRowProps {
  item: Item
  setsData: SetsData | null
  onRemove: () => void
  getCraftingOptions: (craft: string) => string[]
}

function WishlistItemRow({ item, setsData, onRemove, getCraftingOptions }: WishlistItemRowProps) {
  // Get wiki URL for both regular items and augments
  // For augments without a URL field, generate one from the name
  const wikiUrl = getWikiUrl(item.url) ||
    (item.slot === 'Augment' ? `https://ddowiki.com/page/Item:${item.name.replace(/\s+/g, '_')}` : null)
  const augmentColor = item.slot === 'Augment' ? getAugmentColor(item.type || '') : undefined

  return (
    <TableRow hover sx={item.artifact ? artifactTableRowSx : undefined}>
      <TableCell>{item.ml}</TableCell>
      <TableCell>
        <Box sx={{ alignItems: 'center', display: 'inline-flex', gap: 0.5 }}>
          {wikiUrl ? (
            <Link
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: augmentColor || 'text.primary',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  color: 'primary.main'
                }
              }}
            >
              {item.name}
            </Link>
          ) : (
            <Typography variant="body2" fontWeight="bold" sx={{ color: augmentColor }}>
              {item.name}
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={onRemove}
            aria-label="remove from wish list"
            sx={{ p: 0.25, color: 'error.main' }}
          >
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Box>
        {item.slot && (item.slot === 'Weapon' || item.slot === 'Offhand') && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.slot}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {(item.slot && item.slot !== 'Weapon' && item.slot !== 'Offhand')
          ? (item.slot === 'Augment' ? `Augment (${item.type})` : (item.slot === 'Armor' && item.type ? item.type : item.slot))
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
  isQuestGroup?: boolean
}

function CollapsibleGroup({ group, setsData, onRemove, getCraftingOptions, defaultExpanded = true, isQuestGroup = false }: CollapsibleGroupProps) {
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
            {isQuestGroup ? (
              <Link
                href={`https://ddowiki.com/page/${group.label.replace(/\s+/g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main'
                  }
                }}
              >
                {group.label}
              </Link>
            ) : (
              <Typography variant="subtitle2" fontWeight="bold">
                {group.label}
              </Typography>
            )}
            <Chip size="small" label={group.items.length} />
          </Stack>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <WishlistTableColGroup />
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
  const { items: gearItems, augmentItems, craftingData, setsData, loading, refresh, error } = useGearPlanner()

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
    // Extended Map interface with fuzzy lookup
    interface QuestPackMap extends Map<string, string> {
      fuzzyGet?: (questName: string) => string | undefined
    }

    const map: QuestPackMap = new Map<string, string>()

    // Build a normalized lookup for quest names
    const normalizedQuestMap = new Map<string, { originalName: string; pack: string }>()
    Object.values(questsById).forEach(q => {
      if (q.name && q.required_adventure_pack) {
        // Store both the exact name and normalized version
        map.set(q.name, q.required_adventure_pack)

        // Normalize: lowercase, remove "the " prefix, remove extra spaces
        const normalized = q.name.toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()
        normalizedQuestMap.set(normalized, {
          originalName: q.name,
          pack: q.required_adventure_pack
        })
      }
    })

    // Add fuzzy lookup function to the map
    map.fuzzyGet = (questName: string): string | undefined => {
      // Try exact match first
      if (map.has(questName)) {
        return map.get(questName)
      }

      // Try normalized match
      const normalized = questName.toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()
      const fuzzyMatch = normalizedQuestMap.get(normalized)
      if (fuzzyMatch) {
        return fuzzyMatch.pack
      }

      return undefined
    }

    return map
  }, [questsById])

  const entries = useMemo(() => {
    return keys.map((k) => entriesByKey[k]).filter(Boolean)
  }, [entriesByKey, keys])

  const itemLookup = useMemo(() => {
    const lookup = new Map<string, Item>()

      ;[...gearItems, ...augmentItems].forEach((item) => {
        const standardKey = buildWishlistItemKey(item.name, item.ml, item.slot, item.type)
        lookup.set(standardKey, item)

        if (item.slot === 'Augment') {
          const augmentKey = buildWishlistAugmentKey(item.name, item.ml)
          lookup.set(augmentKey, item)
        }
      })

    return lookup
  }, [gearItems, augmentItems])

  const items = useMemo(() => {
    return entries.map((entry) => {
      const matched = itemLookup.get(entry.key)
        ?? itemLookup.get(buildWishlistItemKey(entry.name, entry.ml, entry.slot, entry.type))
        ?? itemLookup.get(buildWishlistAugmentKey(entry.name, entry.ml))
      return entryToItem(entry, matched)
    })
  }, [entries, itemLookup])

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
          // Try fuzzy lookup
          const pack = questNameToPack.fuzzyGet?.(questName) || questNameToPack.get(questName)
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
          <Table size="small" aria-label="wish list table" sx={{ tableLayout: 'fixed' }}>
            <WishlistTableColGroup />
            <TableHead>
              <TableRow>
                <TableCell>ML</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Properties</TableCell>
                <TableCell>Augments/Crafting</TableCell>
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
                    isQuestGroup={groupingMode === 'quest'}
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
