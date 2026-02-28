import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

import { fetchQuestsById, Quest } from '@/api/ddoAudit'
import { Item } from '@/api/ddoGearPlanner'
import ItemTableFilters from '@/components/items/ItemTableFilters'
import ItemTableRow from '@/components/items/ItemTableRow'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import { useWishlist } from '@/contexts/useWishlist'
import { formatAffixPlain } from '@/utils/affixHelpers'

export default function ItemWiki() {
  const { items, augmentItems, craftingData, setsData, loading, refresh, error } = useGearPlanner()
  const { isWished } = useWishlist()
  const { hasItem, importedAt } = useTrove()

  const [searchText, setSearchText] = useState('')
  const [packFilter, setPackFilter] = useState<string[]>([])
  const [questFilter, setQuestFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [effectFilter, setEffectFilter] = useState<string[]>([])
  const [craftingFilter, setCraftingFilter] = useState<string[]>([])
  const [minMl, setMinMl] = useState(1)
  const [maxMl, setMaxMl] = useState(34)
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [showWishlistOnly, setShowWishlistOnly] = useState(false)
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})

  const boxRef = useRef<HTMLDivElement>(null)

  // Combine regular items with augment items
  const allItems = useMemo(() => [...items, ...augmentItems], [items, augmentItems])

  useEffect(() => {
    fetchQuestsById().then(setQuestsById).catch(console.error)
  }, [])

  useEffect(() => {
    if (items.length === 0 && !loading && !error) {
      void refresh(false)
    }
  }, [items.length, loading, error, refresh])

  const questNameToPack = useMemo(() => {
    const map = new Map<string, string>()
    Object.values(questsById).forEach(q => {
      if (q.name && q.required_adventure_pack) {
        map.set(q.name, q.required_adventure_pack)
      }
    })
    return map
  }, [questsById])

  // ---- Shared cross-filter helper ----
  // Filters allItems by every active filter EXCEPT the one named in `exclude`.
  // This lets each filter's option list reflect all other filters.
  const crossFilterItems = useMemo(() => {
    type Exclude = 'pack' | 'quest' | 'type' | 'effect' | 'crafting' | 'ml' | 'search'

    const matchSearch = (item: Item) => {
      if (searchText === '') return true
      const s = `${item.name} ${item.type || ''} ${item.affixes.map(formatAffixPlain).join(' ')} ${item.crafting?.join(' ') || ''} ${item.artifact ? 'artifact' : ''}`.toLowerCase()
      return s.includes(searchText.toLowerCase())
    }
    const matchPack = (item: Item) => {
      if (packFilter.length === 0) return true
      if (!item.quests) return false
      return item.quests.some(qName => {
        const pack = questNameToPack.get(qName)
        return pack && packFilter.includes(pack)
      })
    }
    const matchQuest = (item: Item) => {
      if (questFilter.length === 0) return true
      if (!item.quests) return false
      return item.quests.some(qName => questFilter.includes(qName))
    }
    const matchType = (item: Item) => {
      if (typeFilter.length === 0) return true
      if (item.slot === 'Augment') return typeFilter.includes('Augments')
      return !!(item.type && typeFilter.includes(item.type))
    }
    const matchEffect = (item: Item) => {
      if (effectFilter.length === 0) return true
      return item.affixes.some(a => effectFilter.includes(a.name))
    }
    const matchCrafting = (item: Item) => {
      if (craftingFilter.length === 0) return true
      return !!(item.crafting && item.crafting.some(c => craftingFilter.includes(c)))
    }
    const matchML = (item: Item) => item.ml >= minMl && item.ml <= maxMl

    return (exclude: Exclude) => allItems.filter(item => {
      if (exclude !== 'search' && !matchSearch(item)) return false
      if (exclude !== 'pack' && !matchPack(item)) return false
      if (exclude !== 'quest' && !matchQuest(item)) return false
      if (exclude !== 'type' && !matchType(item)) return false
      if (exclude !== 'effect' && !matchEffect(item)) return false
      if (exclude !== 'crafting' && !matchCrafting(item)) return false
      if (exclude !== 'ml' && !matchML(item)) return false
      return true
    })
  }, [allItems, searchText, packFilter, questFilter, typeFilter, effectFilter, craftingFilter, minMl, maxMl, questNameToPack])

  // ---- Derived option lists (each excludes its own filter) ----

  const uniquePacks = useMemo(() => {
    // Items matching all filters except pack
    const relevant = crossFilterItems('pack')
    const packMls = new Map<string, Set<number>>()
    relevant.forEach(item => {
      if (item.quests) {
        item.quests.forEach(qName => {
          const pack = questNameToPack.get(qName)
          if (pack) {
            if (!packMls.has(pack)) packMls.set(pack, new Set())
            // Only track ML for non-augment items
            if (item.slot !== 'Augment') packMls.get(pack)!.add(item.ml)
          }
        })
      }
    })
    return Array.from(packMls.entries()).map(([pack, mls]) => {
      const mlArr = Array.from(mls).sort((a, b) => a - b)
      const mlDisplay = mlArr.length > 0 ? `ML ${mlArr.join(', ')}` : ''
      return { pack, mlRange: mlDisplay }
    }).sort((a, b) => a.pack.localeCompare(b.pack))
  }, [crossFilterItems, questNameToPack])

  const uniqueQuests = useMemo(() => {
    // Items matching all filters except quest (but still respect pack filter)
    const relevant = crossFilterItems('quest')
    const questMls = new Map<string, { pack: string, mls: Set<number> }>()
    relevant.forEach(item => {
      if (item.quests) {
        item.quests.forEach(qName => {
          const pack = questNameToPack.get(qName) || 'Unknown'
          // Respect pack filter even though we exclude quest filter
          if (packFilter.length > 0 && !packFilter.includes(pack)) return
          if (!questMls.has(qName)) questMls.set(qName, { pack, mls: new Set() })
          if (item.slot !== 'Augment') questMls.get(qName)!.mls.add(item.ml)
        })
      }
    })
    return Array.from(questMls.entries()).map(([name, { pack, mls }]) => {
      const mlArr = Array.from(mls).sort((a, b) => a - b)
      const mlDisplay = mlArr.length > 0 ? `ML ${mlArr.join(', ')}` : ''
      return { name, pack, mlRange: mlDisplay }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [crossFilterItems, questNameToPack, packFilter])

  const uniqueCraftingSlots = useMemo(() => {
    const relevant = crossFilterItems('crafting')
    const slotCount = new Map<string, number>()
    relevant.forEach(item => {
      if (item.crafting) {
        item.crafting.forEach(slot => {
          slotCount.set(slot, (slotCount.get(slot) || 0) + 1)
        })
      }
    })
    return Array.from(slotCount.entries())
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => a.slot.localeCompare(b.slot))
  }, [crossFilterItems])

  const uniqueTypes = useMemo(() => {
    const relevantItems = crossFilterItems('type')

    const typeMap = new Map<string, { count: number, slot: string }>()
    relevantItems.forEach(item => {
      const key = item.slot === 'Augment' ? 'Augments' : (item.type || 'Unknown')
      const existing = typeMap.get(key)
      if (existing) {
        existing.count++
      } else {
        typeMap.set(key, { count: 1, slot: item.slot || '' })
      }
    })
    return Array.from(typeMap.entries()).map(([type, { count, slot }]) => {
      const isWeapon = slot === 'Weapon'
      const category = slot === 'Armor' ? -1 : (isWeapon ? 2 : (slot === 'Offhand' ? 1 : (type === 'Augments' ? -2 : 0)))
      const display = (slot === 'Offhand' || slot === 'Armor') ? type : (slot && slot !== 'Weapon' ? slot : type)
      return { type, count, display, category }
    }).sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category
      if (a.category === -1) {
        const order = ['Docents', 'Cloth armor', 'Light armor', 'Medium armor', 'Heavy armor']
        const aIndex = order.indexOf(a.display)
        const bIndex = order.indexOf(b.display)
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a.display.localeCompare(b.display)
      }
      return a.display.localeCompare(b.display)
    })
  }, [crossFilterItems])

  const uniqueEffects = useMemo(() => {
    const relevantItems = crossFilterItems('effect')
    const effectCount = new Map<string, number>()
    relevantItems.forEach(item => {
      item.affixes.forEach(affix => {
        effectCount.set(affix.name, (effectCount.get(affix.name) || 0) + 1)
      })
    })
    return Array.from(effectCount.entries()).map(([effect, count]) => ({ effect, count })).sort((a, b) => a.effect.localeCompare(b.effect))
  }, [crossFilterItems])

  const filteredItems = useMemo(() => {
    // If no data or still loading initial data (and no stale data), return empty
    if (!allItems.length) return []

    // If no search and no filters, prevent rendering thousands of items
    const hasFilters = searchText !== '' || packFilter.length > 0 || questFilter.length > 0 || typeFilter.length > 0 || effectFilter.length > 0 || craftingFilter.length > 0 || minMl !== 1 || maxMl !== 34 || showAvailableOnly || showWishlistOnly
    if (!hasFilters) {
      return []
    }

    return allItems.filter(item => {
      const searchString = `${item.name} ${item.type || ''} ${item.affixes.map(formatAffixPlain).join(' ')} ${item.crafting?.join(' ') || ''} ${item.artifact ? 'artifact' : ''}`.toLowerCase()
      const matchesSearch = searchText === '' || searchString.includes(searchText.toLowerCase())

      const matchesPack = packFilter.length === 0 || (() => {
        if (!item.quests) return false
        return item.quests.some(qName => {
          const pack = questNameToPack.get(qName)
          return pack && packFilter.includes(pack)
        })
      })()

      const matchesQuest = questFilter.length === 0 || (() => {
        if (!item.quests) return false
        return item.quests.some(qName => questFilter.includes(qName))
      })()

      const matchesType = typeFilter.length === 0 || (() => {
        if (item.slot === 'Augment') {
          return typeFilter.includes('Augments')
        }
        return item.type && typeFilter.includes(item.type)
      })()
      const matchesEffect = effectFilter.length === 0 || item.affixes.some(a => effectFilter.includes(a.name))
      const matchesCrafting = craftingFilter.length === 0 || (item.crafting && item.crafting.some(c => craftingFilter.includes(c)))
      const matchesML = item.ml >= minMl && item.ml <= maxMl
      const matchesAvailable = !showAvailableOnly || hasItem(item.name)
      const matchesWishlist = !showWishlistOnly || isWished(item)
      return matchesSearch && matchesType && matchesEffect && matchesCrafting && matchesML && matchesPack && matchesQuest && matchesAvailable && matchesWishlist
    }).sort((a, b) => {
      const aWished = isWished(a)
      const bWished = isWished(b)
      if (aWished !== bWished) return aWished ? -1 : 1

      // Define category: augments (-2), armors (-1), accessories (0), offhand (1), weapons (2)
      const getCategory = (item: Item) => {
        if (item.slot === 'Augment') return -2
        if (item.slot === 'Armor') return -1
        if (item.slot === 'Offhand') return 1
        if (item.slot === 'Weapon') return 2
        return 0 // Accessories and others
      }
      const catA = getCategory(a)
      const catB = getCategory(b)
      if (catA !== catB) return catA - catB
      // Then by type alphabetically
      const typeA = a.type || ''
      const typeB = b.type || ''
      if (typeA !== typeB) return typeA.localeCompare(typeB)
      // Then by ML descending
      if (a.ml !== b.ml) return b.ml - a.ml
      // Then by name
      return a.name.localeCompare(b.name)
    })
  }, [allItems, searchText, typeFilter, effectFilter, craftingFilter, minMl, maxMl, packFilter, questFilter, questNameToPack, isWished, showAvailableOnly, showWishlistOnly, hasItem])

  const showInitialState = searchText === '' && packFilter.length === 0 && questFilter.length === 0 && typeFilter.length === 0 && effectFilter.length === 0 && craftingFilter.length === 0 && minMl === 1 && maxMl === 34 && !showAvailableOnly && !showWishlistOnly
  const maxDisplayed = 100
  const isTruncated = filteredItems.length > maxDisplayed
  const displayedItems = isTruncated ? filteredItems.slice(0, maxDisplayed) : filteredItems

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {allItems.length === 0 && !loading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>Failed to load items or database is empty.</Typography>
          <Button variant="contained" onClick={() => refresh(true)}>Retry Load</Button>
        </Box>
      )}

      {allItems.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flexShrink: 0 }}>
            <ItemTableFilters
              ref={boxRef}
              mode="wiki"
              searchText={searchText}
              setSearchText={setSearchText}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              effectFilter={effectFilter}
              setEffectFilter={setEffectFilter}
              uniqueTypes={uniqueTypes}
              uniqueEffects={uniqueEffects}
              minMl={minMl}
              maxMl={maxMl}
              setMinMl={setMinMl}
              setMaxMl={setMaxMl}
              packFilter={packFilter}
              setPackFilter={setPackFilter}
              questFilter={questFilter}
              setQuestFilter={setQuestFilter}
              uniquePacks={uniquePacks}
              uniqueQuests={uniqueQuests}
              craftingFilter={craftingFilter}
              setCraftingFilter={setCraftingFilter}
              uniqueCraftingSlots={uniqueCraftingSlots}
              showAvailableOnly={showAvailableOnly}
              setShowAvailableOnly={setShowAvailableOnly}
              showWishlistOnly={showWishlistOnly}
              setShowWishlistOnly={setShowWishlistOnly}
              hasTroveData={importedAt !== null}
            />
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ zIndex: 5 }}>
                <TableRow>
                  <TableCell width="60">ML</TableCell>
                  <TableCell width="250">Name</TableCell>
                  <TableCell width="150">Type</TableCell>
                  <TableCell>Properties</TableCell>
                  <TableCell width="200">Augments/Crafting</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {showInitialState ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        Enter a search term or select filters to view items.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : displayedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No items found matching criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {displayedItems.map((item) => (
                      <ItemTableRow
                        key={`${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`}
                        item={item}
                        searchText={searchText}
                        setsData={setsData}
                        craftingData={craftingData}
                      />
                    ))}
                    {isTruncated && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Showing first {maxDisplayed} results of {filteredItems.length}. Refine search to see more.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </Box>
        </TableContainer>
      )}
    </Container>
  )
}
