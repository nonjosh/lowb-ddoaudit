import CloseIcon from '@mui/icons-material/Close'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import QuestLocationPlayersPanel from '@/components/characters/dialogs/QuestLocationPlayersPanel'
import DdoWikiLink from '@/components/shared/DdoWikiLink'
import RaidNotesDisplay from '@/components/shared/RaidNotesDisplay'
import { useGearPlanner } from '@/contexts/useGearPlanner'
import { getRaidNotesForRaidName } from '@/domains/raids/raidNotes'
import { getItemsForQuest, getRequestedQuestTier, stripQuestTierSuffix } from '@/utils/itemLootHelpers'

import ItemLootTable from './ItemLootTable'

interface ItemLootDialogProps {
  open: boolean
  onClose: () => void
  questName: string
  questId?: string | null
  areaId?: string | null
  questLevelHint?: number | null
  locationIds?: string[]
  showLocationPlayersToggle?: boolean
}

type DialogView = 'loot' | 'players'

interface QuestMetadataState {
  requestKey: string
  questInfo: Quest | null
  areaName: string | null
  loading: boolean
}

function normalizeQuestDisplayName(name: string): string {
  return stripQuestTierSuffix(name)
}

function buildQuestMetadataRequestKey(questName: string, questId?: string | null, areaId?: string | null, locationIds: string[] = []): string {
  return [questName, questId ?? '', areaId ?? '', ...locationIds].join('|')
}

export default function ItemLootDialog({ open, onClose, questName, questId, areaId, questLevelHint, locationIds, showLocationPlayersToggle = false }: ItemLootDialogProps) {
  const normalizedQuestName = useMemo(() => normalizeQuestDisplayName(questName), [questName])
  const normalizedLocationIds = useMemo(
    () => Array.from(new Set((locationIds ?? []).map((id) => String(id)))).sort(),
    [locationIds],
  )
  const metadataRequestKey = useMemo(
    () => buildQuestMetadataRequestKey(questName, questId, areaId, normalizedLocationIds),
    [areaId, normalizedLocationIds, questId, questName],
  )
  const [questMetadata, setQuestMetadata] = useState<QuestMetadataState>({
    requestKey: '',
    questInfo: null,
    areaName: null,
    loading: false,
  })
  const [dialogView, setDialogView] = useState<DialogView>('loot')

  const { items, craftingData, setsData, loading, updatedAt, stale, error, refresh } = useGearPlanner()

  const activeQuestMetadata = open && questMetadata.requestKey === metadataRequestKey ? questMetadata : null
  const questInfo = activeQuestMetadata?.questInfo ?? null
  const areaName = activeQuestMetadata?.areaName ?? null
  const questInfoLoading = activeQuestMetadata?.loading ?? false
  const requestedQuestTier = useMemo(
    () => getRequestedQuestTier(questName, questLevelHint, questInfo),
    [questInfo, questLevelHint, questName],
  )
  const displayQuestName = questInfo?.name ?? normalizedQuestName
  const displayQuestLevel = useMemo(() => {
    if (typeof questLevelHint === 'number') return questLevelHint
    if (requestedQuestTier === 'heroic') return questInfo?.heroicLevel ?? questInfo?.level ?? null
    if (requestedQuestTier === 'epic' || requestedQuestTier === 'legendary') {
      return questInfo?.epicLevel ?? questInfo?.level ?? null
    }
    return questInfo?.level ?? null
  }, [questInfo, questLevelHint, requestedQuestTier])

  const handleClose = () => {
    setDialogView('loot')
    onClose()
  }

  useEffect(() => {
    if (!open || !questName) return

    let cancelled = false

    const loadQuestMetadata = async () => {
      setQuestMetadata({
        requestKey: metadataRequestKey,
        questInfo: null,
        areaName: null,
        loading: true,
      })

      try {
        const quests = await fetchQuestsById()
        if (cancelled) return

        const questByQuestId = questId ? quests[String(questId)] ?? null : null
        const questByAreaId = areaId ? quests[String(areaId)] ?? null : null
        const questByLocationHint = normalizedLocationIds
          .map((id) => quests[String(id)] ?? null)
          .find((quest) => quest && normalizeQuestDisplayName(quest.name) === normalizedQuestName) ?? null
        const found = questByQuestId
          ?? questByAreaId
          ?? questByLocationHint
          ?? Object.values(quests).find((q) => normalizeQuestDisplayName(q.name) === normalizedQuestName)
          ?? null

        let nextAreaName: string | null = null
        if (found?.areaId) {
          const areas = await fetchAreasById()
          if (cancelled) return
          nextAreaName = areas[found.areaId]?.name ?? null
        }

        setQuestMetadata({
          requestKey: metadataRequestKey,
          questInfo: found,
          areaName: nextAreaName,
          loading: false,
        })
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          setQuestMetadata({
            requestKey: metadataRequestKey,
            questInfo: null,
            areaName: null,
            loading: false,
          })
        }
      }
    }

    void loadQuestMetadata()

    return () => {
      cancelled = true
    }
  }, [areaId, metadataRequestKey, normalizedLocationIds, normalizedQuestName, open, questId, questName])

  useEffect(() => {
    if (!open) return
    if (!items.length && !loading) {
      void refresh(false)
    }
  }, [open, items.length, loading, refresh])

  const questItems = useMemo(() => getItemsForQuest(items, questName, craftingData, {
    questInfo,
    questLevelHint,
  }), [craftingData, items, questInfo, questLevelHint, questName])

  const raidNotes = getRaidNotesForRaidName(questName)

  const dialogContentSx = questItems.length > 7 ? { minHeight: '60vh' } : {}

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" component="div">
                {displayQuestName}
              </Typography>
              {requestedQuestTier && <Chip label={requestedQuestTier} size="small" variant="outlined" sx={{ ml: 1, textTransform: 'capitalize' }} />}
              {questInfo?.type === 'Raid' && <Chip label="Raid" size="small" variant="outlined" sx={{ ml: 1 }} />}
              <DdoWikiLink questName={displayQuestName} />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {displayQuestLevel && <Chip label={`Level ${displayQuestLevel}`} size="small" color="primary" variant="outlined" />}
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
              onClick={handleClose}
              sx={{ color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={dialogContentSx}>
        {showLocationPlayersToggle && (
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={dialogView}
              exclusive
              size="small"
              onChange={(_, nextView: DialogView | null) => {
                if (!nextView) return
                setDialogView(nextView)
              }}
            >
              <ToggleButton value="loot" aria-label="show quest loot">
                <ViewListOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
                Loot
              </ToggleButton>
              <ToggleButton value="players" aria-label="show players in location">
                <PeopleAltOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
                Players Here
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        )}

        {dialogView === 'loot' && loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading item data...
            </Typography>
          </Box>
        ) : dialogView === 'loot' ? (
          <>
            <RaidNotesDisplay raidNotes={raidNotes} />
            {(error || updatedAt) && (
              <Box sx={{ mb: 2 }}>
                {error && (
                  <Typography variant="body2" color="error" sx={{ mb: 0.5 }}>
                    {error}
                  </Typography>
                )}
                {updatedAt && (
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: stale ? 'warning.main' : 'text.secondary' }}
                  >
                    Item data cached {new Date(updatedAt).toLocaleString()}
                    {stale ? ' (using cached data)' : ''}
                  </Typography>
                )}
              </Box>
            )}
            <ItemLootTable questItems={questItems} setsData={setsData} craftingData={craftingData} raidNotes={raidNotes} questLevel={displayQuestLevel ?? undefined} />
          </>
        ) : (
          <QuestLocationPlayersPanel
            questInfo={questInfo}
            questInfoLoading={questInfoLoading}
            active={open && dialogView === 'players'}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
