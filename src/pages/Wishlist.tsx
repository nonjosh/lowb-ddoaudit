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
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import { CraftingData, Item, SetsData } from '@/api/ddoGearPlanner'
import ItemTable from '@/components/items/ItemTable'
import ItemTableRow from '@/components/items/ItemTableRow'
import { ITEM_TABLE_COLUMN_WIDTHS } from '@/components/items/itemTableConstants'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useWishlist, WishlistEntry } from '@/contexts/useWishlist'

type GroupingMode = 'none' | 'quest' | 'pack' | 'slot'

interface GroupedItems {
  key: string
  label: string
  sublabel?: string
  questLevel?: string
  isWilderness?: boolean
  items: Item[]
}

const SLOT_ORDER: string[] = [
  'Head', 'Eyes', 'Neck', 'Trinket', 'Cloak', 'Belt',
  'Ring', 'Gloves', 'Bracers', 'Boots', 'Armor',
  'Offhand', 'Weapon', 'Quiver', 'Augment',
]

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

interface CollapsibleGroupProps {
  group: GroupedItems
  setsData: SetsData | null
  craftingData: CraftingData | null
  onRemove: (key: string) => void
  defaultExpanded?: boolean
  isQuestGroup?: boolean
}

function CollapsibleGroup({ group, setsData, craftingData, onRemove, defaultExpanded = true, isQuestGroup = false }: CollapsibleGroupProps) {
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
              <>
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
                {group.questLevel && (
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    ({group.questLevel})
                  </Typography>
                )}
                {group.isWilderness && (
                  <Chip size="small" label="Wilderness" variant="outlined" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
                {group.sublabel && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    — {group.sublabel}
                  </Typography>
                )}
              </>
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
              <colgroup>
                <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.ml }} />
                <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.name }} />
                <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.type }} />
                <col />
                <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.augments }} />
              </colgroup>
              <TableBody>
                {group.items.map((item) => (
                  <ItemTableRow
                    key={`${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`}
                    item={item}
                    setsData={setsData}
                    craftingData={craftingData}
                    showWishlistToggle={false}
                    renderNameExtra={(item) => (
                      <IconButton
                        size="small"
                        onClick={() => onRemove(buildWishlistItemKey(item.name, item.ml, item.slot, item.type))}
                        aria-label="remove from wish list"
                        sx={{ p: 0.25, color: 'error.main' }}
                      >
                        <DeleteSweepIcon fontSize="small" />
                      </IconButton>
                    )}
                  />
                ))}
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
  const [wildernessAreaIds, setWildernessAreaIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchQuestsById().then(setQuestsById).catch(console.error)
    fetchAreasById().then(areas => {
      const ids = new Set<string>()
      for (const area of Object.values(areas)) {
        if (area.is_wilderness) ids.add(area.id)
      }
      setWildernessAreaIds(ids)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!craftingData && !loading && !error) {
      void refresh(false)
    }
  }, [craftingData, loading, error, refresh])

  const questByName = useMemo(() => {
    const map = new Map<string, Quest>()
    Object.values(questsById).forEach(q => {
      if (q.name) {
        map.set(q.name, q)
        const normalized = q.name.toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim()
        if (!map.has(normalized)) {
          map.set(normalized, q)
        }
      }
    })
    return map
  }, [questsById])

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

  // Group items based on grouping mode
  const groupedItems = useMemo((): GroupedItems[] => {
    if (groupingMode === 'none') {
      return [{ key: 'all', label: 'All Items', items }]
    }

    if (groupingMode === 'slot') {
      const groups = new Map<string, Item[]>()
      items.forEach(item => {
        const slotKey = item.slot || 'Unknown'
        const existing = groups.get(slotKey) || []
        existing.push(item)
        groups.set(slotKey, existing)
      })

      // Sort by predefined slot order, unknown slots at the end
      const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
        const idxA = SLOT_ORDER.indexOf(a)
        const idxB = SLOT_ORDER.indexOf(b)
        if (idxA === -1 && idxB === -1) return a.localeCompare(b)
        if (idxA === -1) return 1
        if (idxB === -1) return -1
        return idxA - idxB
      })

      return sortedKeys.map(key => ({
        key,
        label: key,
        items: groups.get(key) || []
      }))
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
          const existing = groups.get(questName) ?? []
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

    return sortedKeys.map(key => {
      const group: GroupedItems = {
        key,
        label: key,
        items: groups.get(key) || []
      }

      // Enrich quest groups with pack name and level
      if (groupingMode === 'quest' && key !== noGroupKey) {
        const quest = questByName.get(key)
          ?? questByName.get(key.toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ').trim())
        if (quest) {
          if (quest.required_adventure_pack) {
            group.sublabel = quest.required_adventure_pack
          }
          const parts: string[] = []
          if (quest.heroicLevel != null && quest.heroicLevel > 0) parts.push(`H ${quest.heroicLevel}`)
          if (quest.epicLevel != null && quest.epicLevel > 0) parts.push(`E ${quest.epicLevel}`)
          if (parts.length > 0) {
            group.questLevel = parts.join(' / ')
          }
          if (quest.areaId && wildernessAreaIds.has(quest.areaId)) {
            group.isWilderness = true
          }
        }
      }

      return group
    })
  }, [items, groupingMode, questNameToPack, questByName, wildernessAreaIds])

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
            <MenuItem value="slot">Gear Slot</MenuItem>
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
      ) : groupingMode === 'none' ? (
        <TableContainer component={Paper} variant="outlined">
          <ItemTable
            items={items}
            setsData={setsData}
            craftingData={craftingData}
            fixedLayout
            showWishlistToggle={false}
            renderNameExtra={(item) => (
              <IconButton
                size="small"
                onClick={() => removeWish(buildWishlistItemKey(item.name, item.ml, item.slot, item.type))}
                aria-label="remove from wish list"
                sx={{ p: 0.25, color: 'error.main' }}
              >
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            )}
          />
        </TableContainer>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="wish list table" sx={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.ml }} />
              <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.name }} />
              <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.type }} />
              <col />
              <col style={{ width: ITEM_TABLE_COLUMN_WIDTHS.augments }} />
            </colgroup>
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
              {groupedItems.map((group) => (
                <CollapsibleGroup
                  key={group.key}
                  group={group}
                  setsData={setsData}
                  craftingData={craftingData}
                  onRemove={removeWish}
                  isQuestGroup={groupingMode === 'quest'}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}
