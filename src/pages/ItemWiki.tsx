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
import { ReactElement, useEffect, useMemo, useRef, useState } from 'react'

import { fetchQuestsById, Quest } from '@/api/ddoAudit'
import { Item, ItemAffix } from '@/api/ddoGearPlanner'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import ItemTableFilters from '@/components/items/ItemTableFilters'
import ItemTableRow from '@/components/items/ItemTableRow'

interface CraftingAffix {
  name: string
  type: string
  value: number | string
}

const highlightText = (text: string, query: string): string | ReactElement => {
  if (!query) return text
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)
  if (index === -1) return text
  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)
  return <>{before}<mark>{match}</mark>{after}</>
}

const formatAffixPlain = (affix: ItemAffix) => {
  let text = affix.name
  if (affix.value && affix.value !== 1 && affix.value !== '1') {
    text += ` +${affix.value}`
  }
  if (affix.type && affix.type !== 'bool') {
    text += ` (${affix.type})`
  }
  return text
}

const formatAffix = (affix: ItemAffix, query: string = ''): string | ReactElement => {
  let text = highlightText(affix.name, query)
  if (affix.value && affix.value !== 1 && affix.value !== '1') {
    text = <>{text} +{affix.value}</>
  }
  if (affix.type && affix.type !== 'bool') {
    text = <>{text} ({affix.type})</>
  }
  return text
}

export default function ItemWiki() {
  const { items, craftingData, setsData, loading, refresh, error } = useGearPlanner()

  const [searchText, setSearchText] = useState('')
  const [packFilter, setPackFilter] = useState<string[]>([])
  const [questFilter, setQuestFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [effectFilter, setEffectFilter] = useState<string[]>([])
  const [minMl, setMinMl] = useState(1)
  const [maxMl, setMaxMl] = useState(34)
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})

  const boxRef = useRef<HTMLDivElement>(null)

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

  const uniquePacks = useMemo(() => {
    const packs = new Set<string>()
    Object.values(questsById).forEach(q => {
      if (q.required_adventure_pack) {
        packs.add(q.required_adventure_pack)
      }
    })
    return Array.from(packs).sort()
  }, [questsById])

  const uniqueQuests = useMemo(() => {
    const questMap = new Map<string, { name: string, pack: string }>()
    Object.values(questsById).forEach(q => {
      if (q.name && q.name !== 'null' && !questMap.has(q.name)) {
        questMap.set(q.name, { name: q.name, pack: q.required_adventure_pack || 'Unknown' })
      }
    })
    const quests = Array.from(questMap.values())

    // Filter by selected packs if any
    if (packFilter.length > 0) {
      return quests.filter(q => packFilter.includes(q.pack))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    return quests.sort((a, b) => a.name.localeCompare(b.name))
  }, [questsById, packFilter])

  const uniqueTypes = useMemo(() => {
    // Filter items based on everything BUT type filter
    const relevantItems = items.filter(item => {
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

      const matchesEffect = effectFilter.length === 0 || item.affixes.some(a => effectFilter.includes(a.name))
      const matchesML = item.ml >= minMl && item.ml <= maxMl
      return matchesSearch && matchesEffect && matchesML && matchesPack && matchesQuest
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
  }, [items, searchText, effectFilter, minMl, maxMl, packFilter, questFilter, questNameToPack])

  const uniqueEffects = useMemo(() => {
    // Filter items based on everything BUT effect filter
    const relevantItems = items.filter(item => {
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
      const matchesML = item.ml >= minMl && item.ml <= maxMl
      return matchesSearch && matchesType && matchesML && matchesPack && matchesQuest
    })

    const effectCount = new Map<string, number>()
    relevantItems.forEach(item => {
      item.affixes.forEach(affix => {
        effectCount.set(affix.name, (effectCount.get(affix.name) || 0) + 1)
      })
    })
    return Array.from(effectCount.entries()).map(([effect, count]) => ({ effect, count })).sort((a, b) => a.effect.localeCompare(b.effect))
  }, [items, searchText, typeFilter, minMl, maxMl, packFilter, questFilter, questNameToPack])

  const filteredItems = useMemo(() => {
    // If no data or still loading initial data (and no stale data), return empty
    if (!items.length) return []

    // If no search and no filters, prevent rendering thousands of items
    if (searchText === '' && packFilter.length === 0 && questFilter.length === 0 && typeFilter.length === 0 && effectFilter.length === 0 && minMl === 1 && maxMl === 34) {
      return []
    }

    return items.filter(item => {
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
      const matchesML = item.ml >= minMl && item.ml <= maxMl
      return matchesSearch && matchesType && matchesEffect && matchesML && matchesPack && matchesQuest
    }).sort((a, b) => {
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
  }, [items, searchText, typeFilter, effectFilter, minMl, maxMl, packFilter, questFilter, questNameToPack])

  const getWikiUrl = (url: string | undefined) => {
    if (!url) return null
    const urlStr = url.trim()
    if ((urlStr.startsWith('/page/') || urlStr.startsWith('/Page/')) &&
      !urlStr.includes('..') &&
      !urlStr.includes('//')) {
      return `https://ddowiki.com${urlStr}`
    }
    return null
  }

  const getAugmentColor = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('blue augment slot')) return '#2196f3'
    if (lower.includes('red augment slot')) return '#f44336'
    if (lower.includes('yellow augment slot')) return '#ffeb3b'
    if (lower.includes('green augment slot')) return '#4caf50'
    if (lower.includes('purple augment slot')) return '#9c27b0'
    if (lower.includes('orange augment slot')) return '#ff9800'
    if (lower.includes('colorless augment slot')) return '#e0e0e0'
    return undefined
  }

  const getCraftingOptions = (craft: string) => {
    if (!craftingData) return []
    const data = craftingData
    if (data[craft] && data[craft]["*"]) {
      const items = data[craft]["*"]
      if (items.length > 0 && items[0].affixes) {
        const affixMap = new Map<string, CraftingAffix>()
        items.forEach((item) => {
          if (item.affixes) {
            item.affixes.forEach(affix => {
              const key = `${affix.name}-${affix.type}`
              const existing = affixMap.get(key)
              const currentValue = typeof affix.value === 'string' ? parseFloat(affix.value) : affix.value
              const existingValue = existing ? (typeof existing.value === 'string' ? parseFloat(existing.value) : existing.value) : 0
              if (!existing || currentValue > existingValue) {
                affixMap.set(key, { name: affix.name, type: affix.type, value: affix.value })
              }
            })
          }
        })
        return Array.from(affixMap.values()).map(affix => formatAffixPlain(affix))
      } else {
        return items.map((item) => item.name ?? '')
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

  const showInitialState = searchText === '' && packFilter.length === 0 && questFilter.length === 0 && typeFilter.length === 0 && effectFilter.length === 0 && minMl === 1 && maxMl === 34
  const maxDisplayed = 100
  const isTruncated = filteredItems.length > maxDisplayed
  const displayedItems = isTruncated ? filteredItems.slice(0, maxDisplayed) : filteredItems

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {items.length === 0 && !loading && (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>Failed to load items or database is empty.</Typography>
          <Button variant="contained" onClick={() => refresh(true)}>Retry Load</Button>
        </Box>
      )}

      {items.length > 0 && (
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
