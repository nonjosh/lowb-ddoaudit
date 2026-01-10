import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import {
  CraftingData,
  fetchCraftingWithMetadata,
  fetchItemsWithMetadata,
  fetchSetsWithMetadata,
  Item,
  SetsData
} from '@/api/ddoGearPlanner'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import RaidNotesDisplay from '@/components/shared/RaidNotesDisplay'
import { getRaidNotesForRaidName } from '@/domains/raids/raidNotes'
import { getItemsForQuest } from '@/utils/itemLootHelpers'

import ItemLootTable from './ItemLootTable'

interface ItemLootDialogProps {
  open: boolean
  onClose: () => void
  questName: string
}

export default function ItemLootDialog({ open, onClose, questName }: ItemLootDialogProps) {
  const [questInfo, setQuestInfo] = useState<Quest | null>(null)
  const [areaName, setAreaName] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [craftingData, setCraftingData] = useState<CraftingData | null>(null)
  const [setsData, setSetsData] = useState<SetsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [gearUpdatedAt, setGearUpdatedAt] = useState<number | null>(null)
  const [gearDataStale, setGearDataStale] = useState(false)
  const [gearError, setGearError] = useState<string | null>(null)

  const loadGearData = useCallback(async (options?: { forceRefresh?: boolean }) => {
    setLoading(true)
    setGearError(null)

    try {
      const [itemsResult, craftingResult, setsResult] = await Promise.all([
        fetchItemsWithMetadata(options),
        fetchCraftingWithMetadata(options),
        fetchSetsWithMetadata(options)
      ])

      setItems(itemsResult.data)
      setCraftingData(craftingResult.data)
      setSetsData(setsResult.data)

      const timestamps = [
        itemsResult.updatedAt,
        craftingResult.updatedAt,
        setsResult.updatedAt
      ].filter((value): value is number => typeof value === 'number')

      setGearUpdatedAt(timestamps.length ? Math.min(...timestamps) : null)
      setGearDataStale(itemsResult.stale || craftingResult.stale || setsResult.stale)
    } catch (error) {
      console.error(error)
      const message = (error as Error)?.message ?? 'Failed to load item data.'
      setGearError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    void loadGearData({ forceRefresh: true })
  }, [loadGearData])

  useEffect(() => {
    if (!open || !questName) return

    setQuestInfo(null)
    setAreaName(null)

    let cancelled = false

    fetchQuestsById()
      .then((quests) => {
        if (cancelled) return

        const found = Object.values(quests).find(q => q.name === questName)
        if (found) {
          setQuestInfo(found)

          if (found.areaId) {
            fetchAreasById()
              .then((areas) => {
                if (cancelled) return
                if (areas[found.areaId!]) {
                  setAreaName(areas[found.areaId!].name)
                }
              })
              .catch(console.error)
          }
        }
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [open, questName])

  useEffect(() => {
    if (!open) return
    void loadGearData()
  }, [open, questName, loadGearData])

  const questItems = useMemo(() => getItemsForQuest(items, questName, craftingData), [items, questName, craftingData])

  const raidNotes = getRaidNotesForRaidName(questName)

  const dialogContentSx = questItems.length > 7 ? { minHeight: '60vh' } : {}

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
              <DdoWikiLink questName={questName} />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {questInfo?.level && <Chip label={`Level ${questInfo.level}`} size="small" color="primary" variant="outlined" />}
              {areaName && <Typography variant="caption" color="text.secondary">{areaName}</Typography>}
            </Stack>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh item data
            </Button>
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
      <DialogContent dividers sx={dialogContentSx}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading item data...
            </Typography>
          </Box>
        ) : (
          <>
            <RaidNotesDisplay raidNotes={raidNotes} />
            {(gearError || gearUpdatedAt) && (
              <Box sx={{ mb: 2 }}>
                {gearError && (
                  <Typography variant="body2" color="error" sx={{ mb: 0.5 }}>
                    {gearError}
                  </Typography>
                )}
                {gearUpdatedAt && (
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: gearDataStale ? 'warning.main' : 'text.secondary' }}
                  >
                    Item data cached {new Date(gearUpdatedAt).toLocaleString()}
                    {gearDataStale ? ' (using cached data)' : ''}
                  </Typography>
                )}
              </Box>
            )}
            <ItemLootTable questItems={questItems} setsData={setsData} craftingData={craftingData} raidNotes={raidNotes} questLevel={questInfo?.level ?? undefined} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
