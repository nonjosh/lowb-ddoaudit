import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import { fetchCrafting, fetchItems, fetchSets, Item, SetsData, CraftingData } from '@/api/ddoGearPlanner'
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
            }).catch(console.error)
          }
        }
      }).catch(console.error)

      // Fetch gear planner data
      const fetchGearData = async () => {
        setLoading(true)
        try {
          const [itemsData, craftingDataResult, setsDataResult] = await Promise.all([
            fetchItems(),
            fetchCrafting(),
            fetchSets()
          ])
          setItems(itemsData)
          setCraftingData(craftingDataResult)
          setSetsData(setsDataResult)
        } catch (error) {
          console.error(error)
        } finally {
          setLoading(false)
        }
      }
      fetchGearData()
    }
  }, [open, questName])

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
            <ItemLootTable questItems={questItems} setsData={setsData} craftingData={craftingData} raidNotes={raidNotes} questLevel={questInfo?.level ?? undefined} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
