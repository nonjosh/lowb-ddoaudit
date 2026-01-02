import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import { getItemsForQuest, ItemAffix } from '@/utils/itemLootHelpers'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'

interface ItemLootDialogProps {
  open: boolean
  onClose: () => void
  questName: string
}

export default function ItemLootDialog({ open, onClose, questName }: ItemLootDialogProps) {
  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [effectFilter, setEffectFilter] = useState<string[]>([])
  const [questInfo, setQuestInfo] = useState<Quest | null>(null)
  const [areaName, setAreaName] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [tableHeadTop, setTableHeadTop] = useState('40px')

  useEffect(() => {
    if (open && questName) {
      fetchQuestsById().then((quests) => {
        const found = Object.values(quests).find(q => q.name === questName)
        if (found) {
          setQuestInfo(found)
          if (found.areaId) {
            fetchAreasById().then((areas) => {
              if (areas[found.areaId!]) {
                setAreaName(areas[found.areaId!].name)
              }
            })
          }
        }
      })
    }
  }, [open, questName])

  useEffect(() => {
    if (boxRef.current) {
      const height = boxRef.current.offsetHeight
      setTableHeadTop(`${height}px`)
    }
  }, [nameFilter, typeFilter, effectFilter]) // update when filters change, as height might change

  const items = useMemo(() => getItemsForQuest(questName), [questName])

  const uniqueTypes = useMemo(() => {
    const typeMap = new Map<string, { count: number, slot: string }>()
    items.forEach(item => {
      const key = item.type || 'Unknown'
      const existing = typeMap.get(key)
      if (existing) {
        existing.count++
      } else {
        typeMap.set(key, { count: 1, slot: item.slot || '' })
      }
    })
    return Array.from(typeMap.entries()).map(([type, { count, slot }]) => {
      const isWeapon = slot === 'Weapon'
      const category = isWeapon ? 2 : (slot === 'Offhand' ? 1 : 0)
      const display = slot === 'Offhand' ? type : (slot && slot !== 'Weapon' ? slot : type)
      return { type, count, display, category }
    }).sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category
      return a.display.localeCompare(b.display)
    })
  }, [items])

  const uniqueEffects = useMemo(() => {
    const effectCount = new Map<string, number>()
    items.forEach(item => {
      item.affixes.forEach(affix => {
        effectCount.set(affix.name, (effectCount.get(affix.name) || 0) + 1)
      })
    })
    return Array.from(effectCount.entries()).map(([effect, count]) => ({ effect, count })).sort((a, b) => a.effect.localeCompare(b.effect))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesName = item.name.toLowerCase().includes(nameFilter.toLowerCase())
      const matchesType = typeFilter.length === 0 || (item.type && typeFilter.includes(item.type))
      const matchesEffect = effectFilter.length === 0 || item.affixes.some(a => effectFilter.includes(a.name))
      return matchesName && matchesType && matchesEffect
    })
  }, [items, nameFilter, typeFilter, effectFilter])

  const formatAffix = (affix: ItemAffix) => {
    let text = affix.name
    if (affix.value && affix.value !== 1 && affix.value !== '1') {
      text += ` +${affix.value}`
    }
    if (affix.type && affix.type !== 'bool') {
      text += ` (${affix.type})`
    }
    return text
  }

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" component="div">
                {questName}
              </Typography>
              {questInfo?.type === 'Raid' && <Chip label="Raid" size="small" variant="outlined" sx={{ ml: 1 }} />}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {questInfo?.level && <Chip label={`Level ${questInfo.level}`} size="small" color="primary" variant="outlined" />}
              {areaName && <Typography variant="caption" color="text.secondary">{areaName}</Typography>}
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {questInfo?.required_adventure_pack && (
              <Typography variant="caption" color="text.secondary">
                {questInfo.required_adventure_pack}
              </Typography>
            )}
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{ color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {filteredItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No items found matching criteria.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            <Box ref={boxRef} sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.paper', mb: 0 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Filter by Name"
                  variant="outlined"
                  size="small"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  fullWidth
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Filter by Type</InputLabel>
                  <Select
                    multiple
                    value={typeFilter}
                    input={<OutlinedInput label="Filter by Type" />}
                    renderValue={(selected) => selected.join(', ')}
                    onChange={(e) => {
                      const value = e.target.value
                      setTypeFilter(typeof value === 'string' ? value.split(',') : value)
                    }}
                  >
                    {(() => {
                      let prevCategory = -1
                      return uniqueTypes.flatMap(({ type, count, display, category }) => {
                        const items = []
                        if (category !== prevCategory && prevCategory !== -1) {
                          items.push(<Divider key={`divider-${type}`} />)
                        }
                        items.push(<MenuItem key={type} value={type}>{display} ({count})</MenuItem>)
                        prevCategory = category
                        return items
                      })
                    })()}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Filter by Effect</InputLabel>
                  <Select
                    multiple
                    value={effectFilter}
                    input={<OutlinedInput label="Filter by Effect" />}
                    renderValue={(selected) => selected.join(', ')}
                    onChange={(e) => {
                      const value = e.target.value
                      setEffectFilter(typeof value === 'string' ? value.split(',') : value)
                    }}
                  >
                    {uniqueEffects.map(({ effect, count }) => (
                      <MenuItem key={effect} value={effect}>{effect} ({count})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
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
                {filteredItems.map((item) => {
                  const itemKey = `${item.name}-${item.ml}-${item.slot || 'no-slot'}-${item.type || 'no-type'}`
                  const wikiUrl = getWikiUrl(item.url)
                  return (
                    <TableRow key={itemKey} hover>
                      <TableCell>{item.ml}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {item.name}
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
                        {item.slot && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.slot}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.affixes.map((affix, idx) => (
                            <li key={idx}>
                              <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                {formatAffix(affix)}
                              </Typography>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {item.crafting?.map((craft, idx) => {
                            const bgColor = getAugmentColor(craft)
                            return (
                              <li key={`craft-${idx}`}>
                                {bgColor ? (
                                  <Box component="span" sx={{
                                    bgcolor: bgColor,
                                    color: bgColor === '#ffeb3b' || bgColor === '#e0e0e0' ? 'black' : 'white',
                                    px: 0.5,
                                    borderRadius: 0.5,
                                    fontSize: '0.75rem',
                                    display: 'inline-block',
                                    lineHeight: 1.2
                                  }}>
                                    {craft}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="info.main" sx={{ fontSize: '0.8125rem' }}>
                                    {craft}
                                  </Typography>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  )
}
