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
import { AffixLike, formatAffix, formatAffixPlain, getAugmentColor, getWikiUrl, highlightText } from '@/utils/affixHelpers'

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

  // Build a map of item MLs per quest name (excluding augments)
  const questItemMlMap = useMemo(() => {
    const map = new Map<string, Set<number>>()
    items.forEach(item => {
      if (item.quests) {
        item.quests.forEach(qName => {
          if (!map.has(qName)) map.set(qName, new Set())
          map.get(qName)!.add(item.ml)
        })
      }
    })
    return map
  }, [items])

  const uniquePacks = useMemo(() => {
    const packMls = new Map<string, Set<number>>()
    Object.values(questsById).forEach(q => {
      if (q.required_adventure_pack && q.name) {
        const pack = q.required_adventure_pack
        if (!packMls.has(pack)) packMls.set(pack, new Set())
        const mls = questItemMlMap.get(q.name)
        if (mls) mls.forEach(ml => packMls.get(pack)!.add(ml))
      }
    })
    return Array.from(packMls.entries()).map(([pack, mls]) => {
      const mlArr = Array.from(mls).sort((a, b) => a - b)
      const mlDisplay = mlArr.length > 0 ? `ML ${mlArr.join(', ')}` : ''
      return { pack, mlRange: mlDisplay }
    }).sort((a, b) => a.pack.localeCompare(b.pack))
  }, [questsById, questItemMlMap])

  const uniqueQuests = useMemo(() => {
    const questMap = new Map<string, { name: string, pack: string, mlRange: string }>()
    Object.values(questsById).forEach(q => {
      if (q.name && q.name !== 'null' && !questMap.has(q.name)) {
        const mls = questItemMlMap.get(q.name)
        const mlArr = mls ? Array.from(mls).sort((a, b) => a - b) : []
        const mlDisplay = mlArr.length > 0 ? `ML ${mlArr.join(', ')}` : ''
        questMap.set(q.name, { name: q.name, pack: q.required_adventure_pack || 'Unknown', mlRange: mlDisplay })
      }
    })
    const quests = Array.from(questMap.values())

    // Filter by selected packs if any
    if (packFilter.length > 0) {
      return quests.filter(q => packFilter.includes(q.pack))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    return quests.sort((a, b) => a.name.localeCompare(b.name))
  }, [questsById, packFilter, questItemMlMap])

  const uniqueCraftingSlots = useMemo(() => {
    const slotCount = new Map<string, number>()
    allItems.forEach(item => {
      if (item.crafting) {
        item.crafting.forEach(slot => {
          slotCount.set(slot, (slotCount.get(slot) || 0) + 1)
        })
      }
    })
    return Array.from(slotCount.entries())
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => a.slot.localeCompare(b.slot))
  }, [allItems])

  const uniqueTypes = useMemo(() => {
    // Filter items based on everything BUT type filter
    const relevantItems = allItems.filter(item => {
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

      const matchesCrafting = craftingFilter.length === 0 || (item.crafting && item.crafting.some(c => craftingFilter.includes(c)))
      const matchesEffect = effectFilter.length === 0 || item.affixes.some(a => effectFilter.includes(a.name))
      const matchesML = item.ml >= minMl && item.ml <= maxMl
      return matchesSearch && matchesEffect && matchesML && matchesPack && matchesQuest && matchesCrafting
    })

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
  }, [allItems, searchText, effectFilter, craftingFilter, minMl, maxMl, packFilter, questFilter, questNameToPack])

  const uniqueEffects = useMemo(() => {
    // Filter items based on everything BUT effect filter
    const relevantItems = allItems.filter(item => {
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
      const matchesCrafting = craftingFilter.length === 0 || (item.crafting && item.crafting.some(c => craftingFilter.includes(c)))
      const matchesML = item.ml >= minMl && item.ml <= maxMl
      return matchesSearch && matchesType && matchesML && matchesPack && matchesQuest && matchesCrafting
    })

    const effectCount = new Map<string, number>()
    relevantItems.forEach(item => {
      item.affixes.forEach(affix => {
        effectCount.set(affix.name, (effectCount.get(affix.name) || 0) + 1)
      })
    })
    return Array.from(effectCount.entries()).map(([effect, count]) => ({ effect, count })).sort((a, b) => a.effect.localeCompare(b.effect))
  }, [allItems, searchText, typeFilter, craftingFilter, minMl, maxMl, packFilter, questFilter, questNameToPack])

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

  const getCraftingOptions = (craft: string) => {
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
  }

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
                        raidNotes={null}
                        highlightText={highlightText}
                        formatAffix={formatAffix}
                        getWikiUrl={getWikiUrl}
                        getAugmentColor={getAugmentColor}
                        getCraftingOptions={getCraftingOptions}
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
