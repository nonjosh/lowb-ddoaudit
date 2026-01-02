import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import { fetchCrafting, fetchItems, fetchSets, Item } from '@/api/ddoGearPlanner'
import { getItemsForQuest } from '@/utils/itemLootHelpers'
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
  const [craftingData, setCraftingData] = useState<any>(null)
  const [setsData, setSetsData] = useState<any>(null)
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
            })
          }
        }
      })

      // Fetch gear planner data
      setLoading(true)
      Promise.all([
        fetchItems().then(setItems),
        fetchCrafting().then(setCraftingData),
        fetchSets().then(setSetsData)
      ]).catch(console.error).finally(() => setLoading(false))
    }
  }, [open, questName])

  const questItems = useMemo(() => getItemsForQuest(items, questName), [items, questName])

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
      <DialogContent dividers sx={{ minHeight: '60vh' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading item data...
            </Typography>
          </Box>
        ) : (
          <ItemLootTable questItems={questItems} setsData={setsData} craftingData={craftingData} />
        )}
      </DialogContent>
    </Dialog>
  )
}
