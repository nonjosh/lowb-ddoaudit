import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Item, CraftingData, SetsData } from '@/api/ddoGearPlanner'
import { useWishlist } from '@/contexts/useWishlist'
import { RaidNotes } from '@/domains/raids/raidNotes'
import { formatAffixPlain } from '@/utils/affixHelpers'

import ItemTableFilters from './ItemTableFilters'
import ItemTableRow from './ItemTableRow'

interface ItemLootTableProps {
  questItems: Item[]
  setsData: SetsData | null
  craftingData: CraftingData | null
  raidNotes: RaidNotes | null
  questLevel?: number
}

export default function ItemLootTable({ questItems, setsData, craftingData, raidNotes, questLevel }: ItemLootTableProps) {
  const { isWished } = useWishlist()

  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [effectFilter, setEffectFilter] = useState<string[]>([])
  const [mlFilter, setMlFilter] = useState<string[]>(() => {
    if (!questLevel) return []
    const minML = questLevel - 6
    return questItems
      .filter(item => item.ml > minML)
      .map(item => item.ml.toString())
      .filter((value, index, self) => self.indexOf(value) === index) // unique
  })
  const boxRef = useRef<HTMLDivElement>(null)
  const [tableHeadTop, setTableHeadTop] = useState('50px')

  useEffect(() => {
    if (boxRef.current) {
      const height = boxRef.current.offsetHeight
      setTableHeadTop(`${height}px`)
    }
  }, [searchText, typeFilter, effectFilter, mlFilter])

  const uniqueTypes = useMemo(() => {
    const typeMap = new Map<string, { count: number, slot: string }>()
    questItems.forEach(item => {
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
  }, [questItems])

  const uniqueEffects = useMemo(() => {
    const effectCount = new Map<string, number>()
    questItems.forEach(item => {
      item.affixes.forEach(affix => {
        effectCount.set(affix.name, (effectCount.get(affix.name) || 0) + 1)
      })
    })
    return Array.from(effectCount.entries()).map(([effect, count]) => ({ effect, count })).sort((a, b) => a.effect.localeCompare(b.effect))
  }, [questItems])

  const uniqueMLs = useMemo(() => {
    const mlCount = new Map<number, number>()
    questItems.forEach(item => {
      mlCount.set(item.ml, (mlCount.get(item.ml) || 0) + 1)
    })
    return Array.from(mlCount.entries()).map(([ml, count]) => ({ ml, count })).sort((a, b) => a.ml - b.ml)
  }, [questItems])

  const filteredItems = useMemo(() => {
    return questItems.filter(item => {
      const searchString = `${item.name} ${item.type || ''} ${item.affixes.map(formatAffixPlain).join(' ')} ${item.crafting?.join(' ') || ''} ${item.artifact ? 'artifact' : ''}`.toLowerCase()
      const matchesSearch = searchText === '' || searchString.includes(searchText.toLowerCase())
      const matchesType = typeFilter.length === 0 || (() => {
        if (item.slot === 'Augment') {
          return typeFilter.includes('Augments')
        }
        return item.type && typeFilter.includes(item.type)
      })()
      const matchesEffect = effectFilter.length === 0 || item.affixes.some(a => effectFilter.includes(a.name))
      const matchesML = mlFilter.length === 0 || mlFilter.includes(item.ml.toString())
      return matchesSearch && matchesType && matchesEffect && matchesML
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
  }, [questItems, searchText, typeFilter, effectFilter, mlFilter, isWished])

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1, px: 1 }}>
        {filteredItems.length} Available Loots (equipments and augments, excluding misc items)
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
        <ItemTableFilters
          ref={boxRef}
          searchText={searchText}
          setSearchText={setSearchText}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          effectFilter={effectFilter}
          setEffectFilter={setEffectFilter}
          uniqueTypes={uniqueTypes}
          uniqueEffects={uniqueEffects}
          mlFilter={mlFilter}
          setMlFilter={setMlFilter}
          uniqueMLs={uniqueMLs}
        />
        <Table size="small">
          <TableHead sx={{ position: 'sticky', top: tableHeadTop, zIndex: 5, bgcolor: 'background.paper' }}>
            <TableRow>
              <TableCell width="60">ML</TableCell>
              <TableCell width="250">Name</TableCell>
              <TableCell width="150">Type</TableCell>
              <TableCell>Properties</TableCell>
              <TableCell width="200">Augments/Crafting</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No items found matching criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <ItemTableRow
                  key={`${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`}
                  item={item}
                  searchText={searchText}
                  setsData={setsData}
                  raidNotes={raidNotes}
                  craftingData={craftingData}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  )
}
