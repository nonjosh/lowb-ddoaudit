import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import InventoryIcon from '@mui/icons-material/Inventory2'
import PersonIcon from '@mui/icons-material/Person'
import StorageIcon from '@mui/icons-material/Storage'
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import {
  type ButtonBaseProps,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Popper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material'
import { type ReactNode, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { ITEM_MAX_LEVEL } from '@/api/ddoGearPlanner'
import type { Item as GearPlannerItem } from '@/api/ddoGearPlanner'
import type {
  TroveBank,
  TroveCharacterInventory,
  TroveItem
} from '@/api/trove'
import TroveImportDialog from '@/components/shared/TroveImportDialog'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { useTrove } from '@/contexts/useTrove'
import { getAugmentColor, getWikiUrl } from '@/utils/affixHelpers'

type AccountPaneMode = 'crafting' | 'shared'
type PaneSortOrder = 'ml' | 'name' | 'stored'

interface ExplorerPageData {
  key: string
  label: string
  items: TroveItem[]
}

interface ExplorerTabData {
  key: string
  label: string
  pages: ExplorerPageData[]
}

interface HoveredItemState {
  anchorEl: HTMLElement
  item: TroveItem
}

interface TroveItemMatch {
  item: TroveItem
  wikiUrl: string | null
}

interface TroveSearchResult {
  key: string
  locationLabel: string
  match: TroveItemMatch
}

interface TroveStoragePaneProps {
  accentColor: string
  emptyMessage: string
  headerContent?: ReactNode
  onHoverItem: (match: TroveItemMatch, anchorEl: HTMLElement) => void
  onInspectItem: (match: TroveItemMatch) => void
  onLeaveItem: () => void
  subtitle: string
  tabs: ExplorerTabData[]
  title: string
  wikiUrlResolver: (item: TroveItem) => string | null
  showTabNavigation?: boolean
  sidebarFooterContent?: ReactNode
}

const DEFAULT_MIN_LEVEL = 1
const DEFAULT_MAX_LEVEL = ITEM_MAX_LEVEL
const GLOBAL_SEARCH_RESULT_LIMIT = 200
const SEARCH_DEBOUNCE_MS = 180

const EQUIPPED_SLOT_ORDER = [
  'Head',
  'Eyes',
  'Neck',
  'Trinket',
  'Cloak',
  'Armor',
  'Bracers',
  'Gloves',
  'Belt',
  'Boots',
  'Ring',
  'Main Hand',
  'Off Hand',
  'Quiver'
]

const paneShellSx = {
  background: 'linear-gradient(180deg, rgba(98, 47, 30, 0.3), rgba(11, 10, 9, 0.98) 22%)',
  border: '1px solid rgba(176, 123, 76, 0.55)',
  borderRadius: 2,
  boxShadow: '0 18px 36px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 222, 173, 0.06)',
  color: 'rgba(235, 227, 204, 0.92)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 720,
  overflow: 'hidden'
} as const

const filterControlSx = {
  '& .MuiInputBase-root': {
    backgroundColor: 'rgba(17, 13, 11, 0.86)',
    color: 'rgba(240, 226, 198, 0.92)',
    fontSize: '0.8rem'
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(203, 187, 156, 0.72)',
    fontSize: '0.78rem'
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(155, 114, 74, 0.42)'
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(202, 147, 95, 0.72)'
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(223, 198, 150, 0.76)'
  },
  minWidth: 88
} as const

function normalizeLabel(label: string | null | undefined, fallback: string): string {
  const trimmed = label?.trim()
  return trimmed ? trimmed : fallback
}

function compareStoredItems(left: TroveItem, right: TroveItem): number {
  const rowDelta = (left.Row ?? 0) - (right.Row ?? 0)
  if (rowDelta !== 0) return rowDelta

  const columnDelta = (left.Column ?? 0) - (right.Column ?? 0)
  if (columnDelta !== 0) return columnDelta

  return left.Name.localeCompare(right.Name)
}

function compareByMinimumLevel(left: TroveItem, right: TroveItem): number {
  const levelDelta = (left.MinimumLevel ?? 0) - (right.MinimumLevel ?? 0)
  if (levelDelta !== 0) return levelDelta

  return left.Name.localeCompare(right.Name)
}

function compareAlphabetically(left: TroveItem, right: TroveItem): number {
  return left.Name.localeCompare(right.Name)
}

function getItemType(item: TroveItem): string {
  return item.ItemSubType || item.ItemType || item.WeaponType || item.TreasureType || 'Unknown'
}

function getPrimaryEquipSlot(item: TroveItem): string {
  return item.EquipsTo?.[0] || item.ItemType || 'Other'
}

function sortEquippedItems(items: TroveItem[]): TroveItem[] {
  return [...items].sort((left, right) => {
    const leftSlot = EQUIPPED_SLOT_ORDER.indexOf(getPrimaryEquipSlot(left))
    const rightSlot = EQUIPPED_SLOT_ORDER.indexOf(getPrimaryEquipSlot(right))
    const slotDelta = (leftSlot === -1 ? Number.MAX_SAFE_INTEGER : leftSlot)
      - (rightSlot === -1 ? Number.MAX_SAFE_INTEGER : rightSlot)

    if (slotDelta !== 0) return slotDelta
    return compareAlphabetically(left, right)
  })
}

function isCosmeticEquippedItem(item: TroveItem): boolean {
  const cosmeticFields = [
    item.ItemType,
    item.ItemSubType,
    item.WeaponType,
    ...(item.EquipsTo || [])
  ]

  return cosmeticFields.some((value) => value?.toLowerCase().includes('cosmetic'))
}

function normalizeBankTabs(bank: TroveBank | undefined): ExplorerTabData[] {
  if (!bank) return []

  return Object.entries(bank.Tabs || {})
    .filter(([, tab]) => {
      const pages = Object.values(tab.Pages || {})
      return pages.some((page) => (page.Items || []).length > 0)
    })
    .sort(([, left], [, right]) => {
      const leftIndex = typeof left.Index === 'number' ? left.Index : Number.MAX_SAFE_INTEGER
      const rightIndex = typeof right.Index === 'number' ? right.Index : Number.MAX_SAFE_INTEGER
      if (leftIndex !== rightIndex) return leftIndex - rightIndex

      return normalizeLabel(left.Name, '').localeCompare(normalizeLabel(right.Name, ''))
    })
    .map(([tabKey, tab], tabIndex) => {
      const rawPages = Object.entries(tab.Pages || {})
      const pages = rawPages
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([pageKey, page]) => ({
          key: pageKey,
          label: `Page ${pageKey}`,
          items: [...(page.Items || [])].sort(compareStoredItems)
        }))

      return {
        key: tabKey,
        label: normalizeLabel(tab.Name, `Tab ${tabIndex + 1}`),
        pages
      }
    })
}

function normalizeInventoryTabs(inventory: TroveCharacterInventory | undefined): ExplorerTabData[] {
  if (!inventory) return []

  const grouped = new Map<string, { items: TroveItem[]; label: string; order: number }>()

  for (const item of inventory.Inventory) {
    if (item.Container !== 'Inventory') continue

    const label = normalizeLabel(item.TabName, `Bag ${item.Tab ?? 0}`)
    const key = `${item.Tab ?? 0}:${item.TabName || ''}`
    const existing = grouped.get(key)

    if (existing) {
      existing.items.push(item)
      continue
    }

    grouped.set(key, {
      items: [item],
      label,
      order: item.Tab ?? Number.MAX_SAFE_INTEGER
    })
  }

  const bagTabs = Array.from(grouped.entries())
    .sort(([, left], [, right]) => {
      if (left.order !== right.order) return left.order - right.order
      return left.label.localeCompare(right.label)
    })
    .map(([key, group]) => ({
      key,
        label: group.label,
        pages: [{
          key,
          label: group.label,
          items: [...group.items].sort(compareStoredItems)
        }]
    }))

  const equippedItems = sortEquippedItems(
    inventory.Inventory.filter((item) => item.Container === 'Equipped')
  )

  const equippedTabs: ExplorerTabData[] = []

  if (equippedItems.length > 0) {
    equippedTabs.push({
      key: 'equipped',
      label: 'Equipped',
      pages: [{ key: 'equipped', label: 'Equipped', items: equippedItems }]
    })

    const cosmeticEquippedItems = equippedItems.filter(isCosmeticEquippedItem)
    if (cosmeticEquippedItems.length > 0) {
      equippedTabs.push({
        key: 'equipped-cosmetic',
        label: 'Equipped Cosmetics',
        pages: [{ key: 'equipped-cosmetic', label: 'Equipped Cosmetics', items: cosmeticEquippedItems }]
      })
    }
  }

  return [...bagTabs, ...equippedTabs]
}

function normalizeStorageItems(bank: TroveBank | undefined): ExplorerTabData[] {
  if (!bank) return []

  const allItems = Object.values(bank.Tabs || {})
    .sort((left, right) => {
      const leftIndex = typeof left.Index === 'number' ? left.Index : Number.MAX_SAFE_INTEGER
      const rightIndex = typeof right.Index === 'number' ? right.Index : Number.MAX_SAFE_INTEGER
      if (leftIndex !== rightIndex) return leftIndex - rightIndex

      return normalizeLabel(left.Name, '').localeCompare(normalizeLabel(right.Name, ''))
    })
    .flatMap((tab) => Object.entries(tab.Pages || {})
      .sort(([left], [right]) => Number(left) - Number(right))
      .flatMap(([, page]) => page.Items || []))

  if (allItems.length === 0) return []

  return [{
    key: 'all-items',
    label: 'All Items',
    pages: [{ key: 'all-items', label: 'All Items', items: [...allItems] }]
  }]
}

function getTypeOptions(items: TroveItem[]): string[] {
  return [...new Set(items.map(getItemType))].sort((left, right) => left.localeCompare(right))
}

function filterAndSortItems(
  items: TroveItem[],
  searchText: string,
  itemType: string,
  minLevel: number,
  maxLevel: number,
  sortOrder: PaneSortOrder
): TroveItem[] {
  const loweredSearch = searchText.trim().toLowerCase()

  const filtered = items.filter((item) => {
    if (loweredSearch) {
      const haystack = [
        item.Name,
        item.Description || '',
        getItemType(item),
        item.Hover || ''
      ].join(' ').toLowerCase()

      if (!haystack.includes(loweredSearch)) {
        return false
      }
    }

    const level = item.MinimumLevel ?? DEFAULT_MIN_LEVEL
    if (level < minLevel || level > maxLevel) {
      return false
    }

    if (itemType !== 'all' && getItemType(item) !== itemType) {
      return false
    }

    return true
  })

  switch (sortOrder) {
    case 'name':
      return filtered.sort(compareAlphabetically)
    case 'ml':
      return filtered.sort(compareByMinimumLevel)
    case 'stored':
    default:
      return filtered.sort(compareStoredItems)
  }
}

function getTabItemCount(tab: ExplorerTabData): number {
  return tab.pages.reduce((count, page) => count + page.items.length, 0)
}

function formatTimestamp(timestamp: number | null): string | null {
  if (!timestamp) return null
  return new Date(timestamp).toLocaleString()
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delayMs, value])

  return debouncedValue
}

function renderTooltipLine(line: string, index: number): ReactNode {
  const trimmed = line.trim()

  if (!trimmed) {
    return <Box key={`tooltip-spacer-${index}`} sx={{ height: 8 }} />
  }

  const colonIndex = line.indexOf(':')
  if (colonIndex <= 0) {
    return (
      <Typography
        key={`tooltip-line-${index}`}
        component="div"
        sx={{
          color: 'rgba(231, 222, 196, 0.94)',
          fontFamily: 'inherit',
          fontSize: '0.85rem',
          lineHeight: 1.35,
          whiteSpace: 'pre-wrap'
        }}
      >
        {line}
      </Typography>
    )
  }

  const keyText = line.slice(0, colonIndex).trim()
  const valueText = line.slice(colonIndex + 1)
  const augmentColor = getAugmentColor(keyText)

  return (
    <Typography
      key={`tooltip-line-${index}`}
      component="div"
      sx={{
        color: 'rgba(231, 222, 196, 0.94)',
        fontFamily: 'inherit',
        fontSize: '0.85rem',
        lineHeight: 1.35,
        whiteSpace: 'pre-wrap'
      }}
    >
      <Box
        component="span"
        sx={{
          color: augmentColor || 'rgba(255, 229, 168, 0.98)',
          fontWeight: 700
        }}
      >
        {keyText}
      </Box>
      {`:${valueText}`}
    </Typography>
  )
}

function getBaseItemName(name: string): string {
  return name.replace(/\s*\(level \d+\)$/i, '')
}

function resolveTroveWikiUrl(
  troveItem: TroveItem,
  itemsByName: Map<string, GearPlannerItem[]>
): string | null {
  const exactMatches = itemsByName.get(troveItem.Name)
  const candidates = exactMatches && exactMatches.length > 0
    ? exactMatches
    : itemsByName.get(getBaseItemName(troveItem.Name))

  if (!candidates || candidates.length === 0) {
    return null
  }

  const level = troveItem.MinimumLevel
  const bestMatch = level === undefined
    ? candidates[0]
    : candidates.find((item) => item.ml === level) || candidates[0]

  return getWikiUrl(bestMatch?.url)
}

function TroveItemDetails({ item, wikiUrl }: { item: TroveItem; wikiUrl: string | null }) {
  const normalizedHover = item.Hover.replace(/\r\n/g, '\n').trim()
  const lines = normalizedHover.length > 0 ? normalizedHover.split('\n') : [item.Name]
  const title = lines[0] || item.Name
  const bodyLines = lines.slice(1)

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, rgba(63, 54, 32, 0.98), rgba(11, 11, 11, 0.98))',
        border: '1px solid rgba(205, 168, 99, 0.75)',
        borderRadius: 2,
        boxShadow: '0 18px 36px rgba(0, 0, 0, 0.55)',
        color: 'rgba(247, 231, 192, 0.96)',
        maxWidth: 'calc(100vw - 24px)',
        p: 2
      }}
    >
      <Stack alignItems="flex-start" direction="row" spacing={1.5}>
        <Avatar
          alt={item.Name}
          src={item.IconSource}
          variant="rounded"
          sx={{
            bgcolor: 'rgba(56, 45, 30, 0.95)',
            border: '1px solid rgba(205, 168, 99, 0.45)',
            height: 46,
            width: 46
          }}
        />
        <Box sx={{ minWidth: 0, width: 'min(460px, calc(100vw - 56px))' }}>
          {wikiUrl ? (
            <Typography
              component="a"
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'rgba(255, 234, 187, 0.98)',
                display: 'inline-block',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '1rem',
                fontWeight: 700,
                lineHeight: 1.2,
                mb: 0.75,
                textDecoration: 'none',
                '&:hover': {
                  color: 'rgba(255, 245, 213, 1)',
                  textDecoration: 'underline'
                }
              }}
            >
              {title}
            </Typography>
          ) : (
            <Typography
              sx={{
                color: 'rgba(255, 234, 187, 0.98)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '1rem',
                fontWeight: 700,
                lineHeight: 1.2,
                mb: 0.75
              }}
            >
              {title}
            </Typography>
          )}
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {item.MinimumLevel !== undefined && (
              <Chip label={`ML ${item.MinimumLevel}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
            )}
            {item.Binding === 'BoundToAccount' && (
              <Chip label="BTA" size="small" sx={{ bgcolor: 'rgba(32, 91, 110, 0.34)' }} />
            )}
            {item.Binding === 'BoundToCharacter' && (
              <Chip label="BTC" size="small" sx={{ bgcolor: 'rgba(128, 58, 44, 0.38)' }} />
            )}
            <Chip label={getItemType(item)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ borderColor: 'rgba(205, 168, 99, 0.22)', my: 1.5 }} />

      <Box sx={{ wordBreak: 'break-word' }}>
        {bodyLines.length > 0
          ? bodyLines.map((line, index) => renderTooltipLine(line, index))
          : renderTooltipLine(normalizedHover || item.Description || item.Name, 0)}
      </Box>
    </Box>
  )
}

function TroveItemRow({
  accentColor,
  contextLabel,
  match,
  onHoverItem,
  onInspectItem,
  onLeaveItem
}: {
  accentColor: string
  contextLabel?: string
  match: TroveItemMatch
  onHoverItem: (match: TroveItemMatch, anchorEl: HTMLElement) => void
  onInspectItem: (match: TroveItemMatch) => void
  onLeaveItem: () => void
}) {
  const { item, wikiUrl } = match
  const bindingLabel = item.Binding === 'BoundToCharacter'
    ? 'BTC'
    : item.Binding === 'BoundToAccount'
      ? 'BTA'
      : null
  const compactSubline = [
    contextLabel,
    item.MinimumLevel !== undefined ? `ML ${item.MinimumLevel}` : null,
    getItemType(item),
    bindingLabel
  ].filter((value): value is string => Boolean(value)).join(' • ')
  const slotLabel = typeof item.Row === 'number' && typeof item.Column === 'number'
    ? `R${item.Row + 1} C${item.Column + 1}`
    : null

  const handleMouseEnter = (event: Parameters<NonNullable<ButtonBaseProps['onMouseEnter']>>[0]) => {
    const preferredAnchor = event.currentTarget.querySelector<HTMLElement>('[data-trove-hover-anchor="true"]')
    onHoverItem(match, preferredAnchor ?? event.currentTarget)
  }

  return (
    <ButtonBase
      component={wikiUrl ? 'a' : 'button'}
      href={wikiUrl || undefined}
      target={wikiUrl ? '_blank' : undefined}
      rel={wikiUrl ? 'noopener noreferrer' : undefined}
      onClick={() => onInspectItem(match)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeaveItem}
      sx={{
        alignItems: 'stretch',
        borderBottom: '1px solid rgba(153, 110, 68, 0.16)',
        color: 'inherit',
        display: 'flex',
        justifyContent: 'space-between',
        px: 1.1,
        py: 0.58,
        textAlign: 'left',
        transition: 'background-color 120ms ease, box-shadow 120ms ease',
        width: '100%',
        '&:hover': {
          backgroundColor: 'rgba(208, 149, 83, 0.12)',
          boxShadow: `inset 2px 0 0 ${accentColor}`
        }
      }}
      >
      <Stack alignItems="center" direction="row" spacing={1} sx={{ minWidth: 0 }}>
        <Box data-trove-hover-anchor="true" sx={{ alignItems: 'center', display: 'flex' }}>
          <Avatar
            alt={item.Name}
            src={item.IconSource}
            variant="rounded"
            sx={{
              bgcolor: 'rgba(20, 16, 15, 0.95)',
              border: '1px solid rgba(184, 139, 90, 0.36)',
              color: 'rgba(230, 212, 171, 0.92)',
              fontSize: '0.68rem',
              height: 24,
              width: 24
            }}
          >
            {item.Name.charAt(0)}
          </Avatar>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: '0.82rem', lineHeight: 1.2 }}>
            {item.Name}
          </Typography>
          {compactSubline && (
            <Typography
              sx={{
                color: 'rgba(204, 185, 145, 0.76)',
                display: '-webkit-box',
                fontSize: '0.66rem',
                lineHeight: 1.25,
                mt: 0.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2
              }}
            >
              {compactSubline}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack alignItems="center" direction="row" spacing={0.7} sx={{ flexShrink: 0, ml: 1 }}>
        {item.Quantity && item.Quantity > 1 && (
          <Chip
            label={`x${item.Quantity}`}
            size="small"
            sx={{
              bgcolor: 'rgba(53, 42, 27, 0.95)',
              color: 'rgba(239, 219, 176, 0.92)',
              height: 17,
              '& .MuiChip-label': {
                px: 0.72
              }
            }}
          />
        )}
        {slotLabel && (
          <Typography sx={{ color: 'rgba(178, 159, 118, 0.68)', fontSize: '0.64rem', letterSpacing: '0.01em' }}>
            {slotLabel}
          </Typography>
        )}
      </Stack>
    </ButtonBase>
  )
}

function TroveStoragePane({
  accentColor,
  emptyMessage,
  headerContent,
  onHoverItem,
  onInspectItem,
  onLeaveItem,
  sidebarFooterContent,
  subtitle,
  tabs,
  title,
  wikiUrlResolver,
  showTabNavigation = true
}: TroveStoragePaneProps) {
  const [activePageKeyState, setActivePageKey] = useState(tabs[0]?.pages[0]?.key ?? '')
  const [activeTabKeyState, setActiveTabKey] = useState(tabs[0]?.key ?? '')
  const [itemType, setItemType] = useState('all')
  const [minLevel, setMinLevel] = useState(DEFAULT_MIN_LEVEL)
  const [maxLevel, setMaxLevel] = useState(DEFAULT_MAX_LEVEL)
  const [searchInput, setSearchInput] = useState('')
  const [sortOrder, setSortOrder] = useState<PaneSortOrder>('stored')
  const debouncedSearchText = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  const deferredSearchText = useDeferredValue(debouncedSearchText)

  const allItems = useMemo(
    () => tabs.flatMap((tab) => tab.pages.flatMap((page) => page.items)),
    [tabs]
  )

  const levelOptions = useMemo(() => {
    const highestLevel = Math.max(
      DEFAULT_MAX_LEVEL,
      ...allItems.map((item) => item.MinimumLevel ?? DEFAULT_MIN_LEVEL)
    )

    return Array.from({ length: highestLevel }, (_, index) => index + 1)
  }, [allItems])

  const typeOptions = useMemo(() => getTypeOptions(allItems), [allItems])

  const activeTabKey = useMemo(() => {
    if (tabs.length === 0) return ''
    return tabs.some((tab) => tab.key === activeTabKeyState) ? activeTabKeyState : tabs[0].key
  }, [activeTabKeyState, tabs])

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.key === activeTabKey) || tabs[0],
    [activeTabKey, tabs]
  )

  const activePageKey = useMemo(() => {
    if (!activeTab) return ''
    return activeTab.pages.some((page) => page.key === activePageKeyState)
      ? activePageKeyState
      : (activeTab.pages[0]?.key ?? '')
  }, [activePageKeyState, activeTab])

  const activePage = useMemo(
    () => activeTab?.pages.find((page) => page.key === activePageKey) || activeTab?.pages[0],
    [activePageKey, activeTab]
  )

  const visibleItems = useMemo(
    () => filterAndSortItems(
      [...(activePage?.items || [])],
      deferredSearchText,
      itemType,
      minLevel,
      maxLevel,
      sortOrder
    ),
    [activePage?.items, deferredSearchText, itemType, maxLevel, minLevel, sortOrder]
  )

  const visibleMatches = useMemo(
    () => visibleItems.map((item) => ({ item, wikiUrl: wikiUrlResolver(item) })),
    [visibleItems, wikiUrlResolver]
  )

  const pageCount = activeTab?.pages.length ?? 0
  const pageIndex = Math.max(0, activeTab?.pages.findIndex((page) => page.key === activePageKey) ?? 0)

  const handlePageChange = (direction: 'next' | 'previous') => {
    if (!activeTab || pageCount <= 1) return

    const nextIndex = direction === 'next'
      ? Math.min(pageCount - 1, pageIndex + 1)
      : Math.max(0, pageIndex - 1)

    setActivePageKey(activeTab.pages[nextIndex].key)
  }

  return (
    <Paper sx={paneShellSx}>
      <Box
        sx={{
          background: 'linear-gradient(180deg, rgba(124, 31, 26, 0.95), rgba(57, 13, 11, 0.98))',
          borderBottom: '1px solid rgba(192, 141, 89, 0.35)',
          px: 2,
          py: 1.1
        }}
      >
        <Typography
          sx={{
            color: 'rgba(255, 226, 163, 0.98)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '0.92rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(225, 208, 175, 0.76)', fontSize: '0.74rem', mt: 0.2 }}>
          {subtitle}
        </Typography>
      </Box>

      {headerContent && (
        <Box sx={{ borderBottom: '1px solid rgba(192, 141, 89, 0.18)', px: 1.5, py: 1.2 }}>
          {headerContent}
        </Box>
      )}

      <Box sx={{ borderBottom: '1px solid rgba(192, 141, 89, 0.18)', px: 1.5, py: 1.2 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Find an item in this pane"
            sx={{
              ...filterControlSx,
              flex: '1 1 220px',
              minWidth: { xs: '100%', sm: 220 },
              '& .MuiInputBase-root': {
                ...filterControlSx['& .MuiInputBase-root'],
                fontSize: '0.82rem'
              }
            }}
          />

          <FormControl size="small" sx={{ ...filterControlSx, minWidth: 80 }}>
            <InputLabel>Min</InputLabel>
            <Select
              label="Min"
              value={String(minLevel)}
              onChange={(event) => {
                const nextValue = Number(event.target.value)
                setMinLevel(nextValue)
                setMaxLevel((current) => Math.max(current, nextValue))
              }}
            >
              {levelOptions.map((level) => (
                <MenuItem key={`min-${level}`} value={String(level)}>
                  {level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ ...filterControlSx, minWidth: 80 }}>
            <InputLabel>Max</InputLabel>
            <Select
              label="Max"
              value={String(maxLevel)}
              onChange={(event) => {
                const nextValue = Number(event.target.value)
                setMaxLevel(nextValue)
                setMinLevel((current) => Math.min(current, nextValue))
              }}
            >
              {levelOptions.map((level) => (
                <MenuItem key={`max-${level}`} value={String(level)}>
                  {level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ ...filterControlSx, minWidth: 132 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={itemType}
              onChange={(event) => setItemType(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {typeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ ...filterControlSx, minWidth: 188 }}>
            <InputLabel>Order</InputLabel>
            <Select
              label="Order"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as PaneSortOrder)}
            >
              <MenuItem value="stored">Stored Order</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="ml">Minimum Level</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
          <Box
            sx={{
              borderBottom: '1px solid rgba(153, 110, 68, 0.16)',
              color: 'rgba(219, 200, 160, 0.68)',
              display: 'flex',
              fontSize: '0.72rem',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.9
            }}
          >
            <span>{activeTab ? `${activeTab.label}${pageCount > 1 ? ` • ${activePage?.label}` : ''}` : 'No active tab'}</span>
            <span>{visibleMatches.length} visible</span>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {tabs.length === 0 && (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.84rem' }}>
                  {emptyMessage}
                </Typography>
              </Box>
            )}

            {tabs.length > 0 && visibleMatches.length === 0 && (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.84rem' }}>
                  No items match the current filters on this page.
                </Typography>
              </Box>
            )}

            {visibleMatches.map((match) => (
              <TroveItemRow
                key={`${match.item.ItemId}-${match.item.Row}-${match.item.Column}-${match.item.Name}`}
                accentColor={accentColor}
                match={match}
                onHoverItem={onHoverItem}
                onInspectItem={onInspectItem}
                onLeaveItem={onLeaveItem}
              />
            ))}
          </Box>

          {showTabNavigation && (
            <Box
              sx={{
                borderTop: '1px solid rgba(153, 110, 68, 0.16)',
                display: 'flex',
                justifyContent: 'space-between',
                px: 1.1,
                py: 0.8
              }}
            >
              <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.72rem' }}>
                Page {pageCount > 0 ? pageIndex + 1 : 0} of {pageCount}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  size="small"
                  onClick={() => handlePageChange('previous')}
                  disabled={pageIndex === 0 || pageCount <= 1}
                  sx={{ color: 'rgba(222, 192, 139, 0.78)' }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handlePageChange('next')}
                  disabled={pageIndex >= pageCount - 1 || pageCount <= 1}
                  sx={{ color: 'rgba(222, 192, 139, 0.78)' }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          )}
        </Box>

        {showTabNavigation && (
          <>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(153, 110, 68, 0.18)' }} />

            <Box
              sx={{
                bgcolor: 'rgba(17, 13, 11, 0.72)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 116,
                width: 116
              }}
            >
              <Box sx={{ borderBottom: '1px solid rgba(153, 110, 68, 0.18)', px: 1.1, py: 0.9 }}>
                <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.72rem' }}>
                  Tabs
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto', p: 0.75 }}>
                <Stack spacing={0.75}>
                  {tabs.map((tab) => {
                    const isActive = tab.key === activeTab?.key
                    const tabItemCount = getTabItemCount(tab)

                    return (
                      <ButtonBase
                        key={tab.key}
                        onClick={() => {
                          setActiveTabKey(tab.key)
                          setActivePageKey(tab.pages[0]?.key ?? '')
                        }}
                        sx={{
                          alignItems: 'stretch',
                          bgcolor: isActive ? 'rgba(182, 130, 71, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid',
                          borderColor: isActive ? accentColor : 'rgba(150, 110, 72, 0.16)',
                          borderRadius: 1,
                          color: 'inherit',
                          display: 'flex',
                          justifyContent: 'space-between',
                          px: 0.9,
                          py: 0.6,
                          textAlign: 'left',
                          width: '100%',
                          '&:hover': {
                            bgcolor: isActive ? 'rgba(182, 130, 71, 0.24)' : 'rgba(205, 153, 89, 0.09)'
                          }
                        }}
                      >
                        <Typography noWrap sx={{ fontSize: '0.76rem', lineHeight: 1.15, maxWidth: 70 }}>
                          {tab.label}
                        </Typography>
                        <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.72rem', ml: 0.8 }}>
                          {tabItemCount}
                        </Typography>
                      </ButtonBase>
                    )
                  })}
                </Stack>
              </Box>

              {sidebarFooterContent && (
                <Box sx={{ borderTop: '1px solid rgba(153, 110, 68, 0.18)', p: 0.75 }}>
                  {sidebarFooterContent}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  )
}

export default function TroveExplorer() {
  const {
    accountData,
    characterBanks,
    characterInventories,
    characters,
    hiddenCharacterIds,
    importedAt,
    inventoryMap
  } = useTrove()
  const { augmentItems, items } = useGearPlanner()

  const [accountMode, setAccountMode] = useState<AccountPaneMode>('shared')
  const [globalSearchInput, setGlobalSearchInput] = useState('')
  const [hoveredItem, setHoveredItem] = useState<HoveredItemState | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedCharacterIdState, setSelectedCharacterId] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<TroveItemMatch | null>(null)
  const [showHiddenCharacters, setShowHiddenCharacters] = useState(true)
  const debouncedGlobalSearchText = useDebouncedValue(globalSearchInput, SEARCH_DEBOUNCE_MS)
  const deferredGlobalSearchText = useDeferredValue(debouncedGlobalSearchText)

  const supportsHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const hoverCloseTimeoutRef = useRef<number | null>(null)

  const clearHoverCloseTimeout = () => {
    if (hoverCloseTimeoutRef.current !== null) {
      window.clearTimeout(hoverCloseTimeoutRef.current)
      hoverCloseTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearHoverCloseTimeout()
    }
  }, [])

  const allGearPlannerItems = useMemo(() => [...items, ...augmentItems], [augmentItems, items])
  const itemsByName = useMemo(() => {
    const itemMap = new Map<string, GearPlannerItem[]>()

    for (const item of allGearPlannerItems) {
      const exactMatches = itemMap.get(item.name) || []
      exactMatches.push(item)
      itemMap.set(item.name, exactMatches)

      const baseName = getBaseItemName(item.name)
      if (baseName !== item.name) {
        const baseMatches = itemMap.get(baseName) || []
        baseMatches.push(item)
        itemMap.set(baseName, baseMatches)
      }
    }

    return itemMap
  }, [allGearPlannerItems])

  const resolveWikiUrl = useCallback(
    (item: TroveItem) => resolveTroveWikiUrl(item, itemsByName),
    [itemsByName]
  )

  const explorerCharacters = useMemo(() => {
    const namesById = new Map<number, string>()

    for (const character of characters) {
      if (!showHiddenCharacters && hiddenCharacterIds.includes(character.id)) continue
      namesById.set(character.id, character.name)
    }

    for (const bank of characterBanks) {
      if (!showHiddenCharacters && hiddenCharacterIds.includes(bank.CharacterId)) continue
      namesById.set(bank.CharacterId, bank.Name)
    }

    for (const inventory of characterInventories) {
      if (!showHiddenCharacters && hiddenCharacterIds.includes(inventory.CharacterId)) continue
      namesById.set(inventory.CharacterId, inventory.Name)
    }

    return Array.from(namesById.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [characterBanks, characterInventories, characters, hiddenCharacterIds, showHiddenCharacters])

  const selectedCharacterId = useMemo(() => {
    if (explorerCharacters.length === 0) return null
    return explorerCharacters.some((character) => character.id === selectedCharacterIdState)
      ? selectedCharacterIdState
      : explorerCharacters[0].id
  }, [explorerCharacters, selectedCharacterIdState])

  const bankByCharacterId = useMemo(() => {
    const bankMap = new Map<number, TroveBank>()

    for (const bank of characterBanks) {
      bankMap.set(bank.CharacterId, bank.PersonalBank)
    }

    return bankMap
  }, [characterBanks])

  const inventoryByCharacterId = useMemo(() => {
    const inventoryMapByCharacter = new Map<number, TroveCharacterInventory>()

    for (const inventory of characterInventories) {
      inventoryMapByCharacter.set(inventory.CharacterId, inventory)
    }

    return inventoryMapByCharacter
  }, [characterInventories])

  const selectedCharacter = useMemo(
    () => explorerCharacters.find((character) => character.id === selectedCharacterId) || null,
    [explorerCharacters, selectedCharacterId]
  )

  const activeAccountMode = useMemo<AccountPaneMode>(() => {
    if (accountMode === 'crafting' && !accountData?.CraftingBank) {
      return 'shared'
    }

    return accountMode
  }, [accountData?.CraftingBank, accountMode])

  const accountTabs = useMemo(
    () => activeAccountMode === 'shared'
      ? normalizeBankTabs(accountData?.SharedBank)
      : normalizeStorageItems(accountData?.CraftingBank),
    [accountData?.CraftingBank, accountData?.SharedBank, activeAccountMode]
  )

  const characterBankTabs = useMemo(
    () => normalizeBankTabs(selectedCharacterId !== null ? bankByCharacterId.get(selectedCharacterId) : undefined),
    [bankByCharacterId, selectedCharacterId]
  )

  const inventoryTabs = useMemo(
    () => normalizeInventoryTabs(
      selectedCharacterId !== null ? inventoryByCharacterId.get(selectedCharacterId) : undefined
    ),
    [inventoryByCharacterId, selectedCharacterId]
  )

  const globalSearchResults = useMemo(() => {
    const query = deferredGlobalSearchText.trim().toLowerCase()
    if (!query) return [] as TroveSearchResult[]

    const results: TroveSearchResult[] = []
    const sortedCharacters = [...explorerCharacters].sort((left, right) => left.name.localeCompare(right.name))

    const appendResult = (item: TroveItem, locationLabel: string, key: string) => {
      const haystack = [
        item.Name,
        item.Description || '',
        item.Hover || '',
        getItemType(item)
      ].join(' ').toLowerCase()

      if (!haystack.includes(query)) {
        return
      }

      results.push({
        key,
        locationLabel,
        match: {
          item,
          wikiUrl: resolveWikiUrl(item)
        }
      })
    }

    const addBankResults = (bank: TroveBank | undefined, locationPrefix: string) => {
      if (!bank) return

      for (const [tabKey, tab] of Object.entries(bank.Tabs || {})) {
        for (const [pageKey, page] of Object.entries(tab.Pages || {})) {
          for (const item of page.Items || []) {
            appendResult(
              item,
              `${locationPrefix} • ${normalizeLabel(tab.Name, `Tab ${tab.Index + 1 || 1}`)} • Page ${pageKey}`,
              `${locationPrefix}-${tabKey}-${pageKey}-${item.ItemId}-${item.Row}-${item.Column}`
            )
          }
        }
      }
    }

    addBankResults(accountData?.SharedBank, 'Shared Account Bank')
    addBankResults(accountData?.CraftingBank, 'Crafting Storage')

    for (const character of sortedCharacters) {
      const bank = bankByCharacterId.get(character.id)
      if (bank) {
        addBankResults(bank, `${character.name} • Personal Bank`)
      }

      const inventory = inventoryByCharacterId.get(character.id)
      if (!inventory) continue

      for (const item of inventory.Inventory) {
        const locationSuffix = item.Container === 'Equipped'
          ? 'Equipped'
          : normalizeLabel(item.TabName, `Bag ${item.Tab ?? 0}`)

        appendResult(
          item,
          `${character.name} • ${locationSuffix}`,
          `${character.id}-${item.Container}-${item.Tab}-${item.ItemId}-${item.Row}-${item.Column}`
        )
      }
    }

    return results
      .sort((left, right) => {
        const nameDelta = left.match.item.Name.localeCompare(right.match.item.Name)
        if (nameDelta !== 0) return nameDelta
        return left.locationLabel.localeCompare(right.locationLabel)
      })
      .slice(0, GLOBAL_SEARCH_RESULT_LIMIT)
  }, [
    accountData?.CraftingBank,
    accountData?.SharedBank,
    bankByCharacterId,
    deferredGlobalSearchText,
    explorerCharacters,
    inventoryByCharacterId,
    resolveWikiUrl
  ])

  const hasSnapshotData = Boolean(accountData) || characterBanks.length > 0 || characterInventories.length > 0
  const needsReimport = inventoryMap.size > 0 && !hasSnapshotData
  const importedAtLabel = formatTimestamp(importedAt)

  const handleHoverItem = (match: TroveItemMatch, anchorEl: HTMLElement) => {
    if (!supportsHover) return
    clearHoverCloseTimeout()
    setHoveredItem({ anchorEl, item: match.item })
  }

  const handleInspectItem = (match: TroveItemMatch) => {
    setSelectedItem(match)
  }

  const handleLeaveItem = () => {
    if (!supportsHover) return
    clearHoverCloseTimeout()
    hoverCloseTimeoutRef.current = window.setTimeout(() => {
      setHoveredItem(null)
      hoverCloseTimeoutRef.current = null
    }, 120)
  }

  const characterMenuItems = explorerCharacters.map((character) => (
    <MenuItem key={character.id} value={String(character.id)}>
      {character.name}
    </MenuItem>
  ))

  return (
    <Container maxWidth={false} sx={{ px: { xs: 1.5, md: 2.5 }, py: 3 }}>
      <Stack spacing={2.25}>
        <Paper
          sx={{
            background: 'radial-gradient(circle at top left, rgba(136, 59, 36, 0.24), rgba(24, 20, 17, 0.97) 56%)',
            border: '1px solid rgba(176, 123, 76, 0.45)',
            borderRadius: 2.5,
            boxShadow: '0 14px 30px rgba(0, 0, 0, 0.28)',
            px: { xs: 1.75, md: 2.25 },
            py: { xs: 1.5, md: 1.75 }
          }}
        >
          <Stack spacing={1.15}>
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              flexWrap="wrap"
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: 'rgba(222, 203, 163, 0.82)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase'
                  }}
                >
                  Trove Data Explorer
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255, 226, 163, 0.96)',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: { xs: '1.08rem', md: '1.2rem' },
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    mt: 0.15
                  }}
                >
                  Cross-Pane Search
                </Typography>
                <Typography sx={{ color: 'rgba(212, 193, 156, 0.74)', fontSize: '0.78rem', mt: 0.35 }}>
                  Search shared storage, visible personal banks, carried inventory, and equipped gear in one pass.
                </Typography>
              </Box>

              <Stack alignItems={{ xs: 'stretch', sm: 'flex-end' }} spacing={0.9} sx={{ minWidth: { xs: '100%', sm: 320 } }}>
                <Stack direction="row" spacing={0.9} useFlexGap flexWrap="wrap" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                  {importedAtLabel && <Chip label={`Imported ${importedAtLabel}`} />}
                  {accountData && <Chip icon={<WarehouseIcon />} label="Shared storage ready" />}
                  {characterBanks.length > 0 && <Chip icon={<StorageIcon />} label={`${characterBanks.length} personal bank${characterBanks.length === 1 ? '' : 's'}`} />}
                  {characterInventories.length > 0 && <Chip icon={<InventoryIcon />} label={`${characterInventories.length} character inventor${characterInventories.length === 1 ? 'y' : 'ies'}`} />}
                </Stack>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={showHiddenCharacters}
                        onChange={(event) => setShowHiddenCharacters(event.target.checked)}
                        size="small"
                      />
                    )}
                    label={<Typography sx={{ color: 'rgba(231, 222, 196, 0.88)', fontSize: '0.8rem' }}>Show hidden characters</Typography>}
                    sx={{ m: 0 }}
                  />

                  <Button size="small" variant="contained" onClick={() => setImportDialogOpen(true)}>
                    Import Trove Data
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            <TextField
              fullWidth
              size="small"
              value={globalSearchInput}
              onChange={(event) => setGlobalSearchInput(event.target.value)}
              placeholder="Search every pane and every character"
              sx={{
                ...filterControlSx,
                '& .MuiInputBase-root': {
                  ...filterControlSx['& .MuiInputBase-root'],
                  fontSize: '0.86rem'
                }
              }}
            />

            {globalSearchInput.trim().length > 0 && (
              <Box
                sx={{
                  border: '1px solid rgba(153, 110, 68, 0.18)',
                  borderRadius: 1.5,
                  maxHeight: 340,
                  overflowY: 'auto'
                }}
              >
                {globalSearchResults.length === 0 ? (
                  <Box sx={{ px: 1.5, py: 2 }}>
                    <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.84rem' }}>
                      No Trove items match that search across the current explorer scope.
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider sx={{ borderColor: 'rgba(153, 110, 68, 0.16)' }} />}>
                    {globalSearchResults.map((result) => (
                      <TroveItemRow
                        key={result.key}
                        accentColor="rgba(201, 167, 107, 0.96)"
                        contextLabel={result.locationLabel}
                        match={result.match}
                        onHoverItem={handleHoverItem}
                        onInspectItem={handleInspectItem}
                        onLeaveItem={handleLeaveItem}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {globalSearchInput.trim().length > 0 && globalSearchResults.length > 0 && (
              <Typography sx={{ color: 'rgba(212, 193, 156, 0.72)', fontSize: '0.78rem' }}>
                Showing {globalSearchResults.length} result{globalSearchResults.length === 1 ? '' : 's'}.
                Results include items from {showHiddenCharacters ? 'all imported characters' : 'currently visible characters only'}.
              </Typography>
            )}
          </Stack>
        </Paper>

        {!hasSnapshotData && (
          <Paper
            sx={{
              background: 'linear-gradient(180deg, rgba(43, 30, 23, 0.96), rgba(21, 18, 16, 0.98))',
              border: '1px solid rgba(176, 123, 76, 0.42)',
              borderRadius: 2,
              p: 3
            }}
          >
            <Typography sx={{ color: 'rgba(242, 223, 184, 0.94)', fontSize: '1rem', fontWeight: 600 }}>
              {needsReimport ? 'Reimport required for explorer mode' : 'No Trove snapshots loaded yet'}
            </Typography>
            <Typography sx={{ color: 'rgba(209, 194, 164, 0.78)', mt: 0.9 }}>
              {needsReimport
                ? 'Older imports only stored the flattened availability map. Reimport the same Trove JSON files once to unlock shared-bank, personal-bank, and inventory browsing.'
                : 'Import your DDO Helper Trove JSON files to inspect shared storage, personal bank tabs, and per-character inventory with hoverable item descriptions.'}
            </Typography>
            <Button sx={{ mt: 2 }} variant="contained" onClick={() => setImportDialogOpen(true)}>
              Open Trove Import
            </Button>
          </Paper>
        )}

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              xl: '1.08fr minmax(0, 1.92fr)'
            }
          }}
        >
          <TroveStoragePane
            accentColor="rgba(224, 167, 99, 0.96)"
            emptyMessage={activeAccountMode === 'shared'
              ? 'No shared-bank snapshot is available in the current import.'
              : 'No crafting-storage snapshot is available in the current import.'}
            headerContent={
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between">
                <FormControl size="small" sx={{ ...filterControlSx, minWidth: { xs: '100%', sm: 238 } }}>
                  <InputLabel>Storage</InputLabel>
                  <Select
                    label="Storage"
                    value={activeAccountMode}
                    onChange={(event) => setAccountMode(event.target.value as AccountPaneMode)}
                  >
                    <MenuItem value="shared">Shared Account Bank</MenuItem>
                    <MenuItem value="crafting" disabled={!accountData?.CraftingBank}>Crafting Storage</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            }
            onHoverItem={handleHoverItem}
            onInspectItem={handleInspectItem}
            onLeaveItem={handleLeaveItem}
            subtitle={activeAccountMode === 'shared' ? 'Shared account storage' : 'Crafting ingredient storage'}
            showTabNavigation={activeAccountMode === 'shared'}
            tabs={accountTabs}
            title={activeAccountMode === 'shared' ? 'Shared Account Bank' : 'Crafting Storage'}
            wikiUrlResolver={resolveWikiUrl}
          />

          <Paper
            sx={{
              background: 'radial-gradient(circle at top left, rgba(54, 44, 29, 0.42), rgba(12, 11, 10, 0.97) 64%)',
              border: '1px solid rgba(176, 123, 76, 0.4)',
              borderRadius: 2,
              boxShadow: '0 14px 30px rgba(0, 0, 0, 0.24)',
              overflow: 'hidden',
              p: { xs: 1.2, md: 1.5 }
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(180deg, rgba(85, 39, 26, 0.58), rgba(23, 17, 14, 0.72))',
                border: '1px solid rgba(176, 123, 76, 0.28)',
                borderRadius: 1.6,
                mb: 1.5,
                px: { xs: 1.1, md: 1.35 },
                py: 1
              }}
            >
              <Stack spacing={0.9}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: 'rgba(222, 203, 163, 0.82)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}
                    >
                      Character Workspace
                    </Typography>
                    <Typography sx={{ color: 'rgba(212, 193, 156, 0.74)', fontSize: '0.76rem', mt: 0.2 }}>
                      One selected character drives both Character Bank and Character Inventory.
                    </Typography>
                  </Box>

                  <FormControl size="small" sx={{ ...filterControlSx, minWidth: { xs: '100%', sm: 230 } }}>
                    <InputLabel>Character</InputLabel>
                    <Select
                      label="Character"
                      value={selectedCharacterId !== null ? String(selectedCharacterId) : ''}
                      onChange={(event) => setSelectedCharacterId(event.target.value ? Number(event.target.value) : null)}
                    >
                      {characterMenuItems}
                    </Select>
                  </FormControl>
                </Stack>

                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                  <Chip icon={<PersonIcon />} label={`Bank · ${selectedCharacter ? selectedCharacter.name : 'No character selected'}`} size="small" />
                  <Chip icon={<ViewCarouselIcon />} label={`Inventory · ${selectedCharacter ? selectedCharacter.name : 'No character selected'}`} size="small" />
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'repeat(2, minmax(0, 1fr))'
                }
              }}
            >
              <TroveStoragePane
                accentColor="rgba(147, 196, 255, 0.96)"
                emptyMessage={selectedCharacter
                  ? `${selectedCharacter.name} does not have a personal bank snapshot in the current import.`
                  : 'Select a character to inspect a personal bank snapshot.'}
                headerContent={
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between">
                    <Chip icon={<PersonIcon />} label={selectedCharacter ? selectedCharacter.name : 'No character selected'} size="small" />
                  </Stack>
                }
                onHoverItem={handleHoverItem}
                onInspectItem={handleInspectItem}
                onLeaveItem={handleLeaveItem}
                subtitle={selectedCharacter ? `${selectedCharacter.name}'s personal bank tabs` : 'Character bank'}
                tabs={characterBankTabs}
                title="Character Bank"
                wikiUrlResolver={resolveWikiUrl}
              />

              <TroveStoragePane
                accentColor="rgba(177, 223, 144, 0.96)"
                emptyMessage={selectedCharacter
                  ? `${selectedCharacter.name} does not have an inventory snapshot in the current import.`
                  : 'Select a character to inspect inventory and equipped items.'}
                headerContent={
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" justifyContent="space-between">
                    <Chip icon={<ViewCarouselIcon />} label={selectedCharacter ? selectedCharacter.name : 'No character selected'} size="small" />
                  </Stack>
                }
                onHoverItem={handleHoverItem}
                onInspectItem={handleInspectItem}
                onLeaveItem={handleLeaveItem}
                subtitle={selectedCharacter
                  ? `${selectedCharacter.name}'s bag tabs, equipped gear, and equipped cosmetics`
                  : 'Character inventory'}
                tabs={inventoryTabs}
                title="Character Inventory"
                wikiUrlResolver={resolveWikiUrl}
              />
            </Box>
          </Paper>
        </Box>
      </Stack>

      <Popper
        open={supportsHover && Boolean(hoveredItem)}
        anchorEl={hoveredItem?.anchorEl}
        placement="right-start"
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [10, 4]
            }
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['left-start', 'left', 'bottom-start', 'top-start']
            }
          },
          {
            name: 'preventOverflow',
            options: {
              altAxis: true,
              padding: 10,
              rootBoundary: 'viewport',
              tether: true
            }
          }
        ]}
        sx={{ pointerEvents: 'none', zIndex: 1500 }}
      >
        {hoveredItem && (
          <Box
            onMouseEnter={clearHoverCloseTimeout}
            onMouseLeave={handleLeaveItem}
            sx={{ pointerEvents: 'auto' }}
          >
            <TroveItemDetails item={hoveredItem.item} wikiUrl={resolveWikiUrl(hoveredItem.item)} />
          </Box>
        )}
      </Popper>

      <Dialog open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} maxWidth="sm" fullWidth>
        {selectedItem && (
          <>
            <DialogTitle sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              Inspect Item
              <IconButton onClick={() => setSelectedItem(null)} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ bgcolor: 'rgba(18, 16, 15, 0.98)', p: 2.25 }}>
              <TroveItemDetails item={selectedItem.item} wikiUrl={selectedItem.wikiUrl} />
            </DialogContent>
          </>
        )}
      </Dialog>

      <TroveImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
    </Container>
  )
}
