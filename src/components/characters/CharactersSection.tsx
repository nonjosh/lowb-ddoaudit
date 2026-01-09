import PeopleIcon from '@mui/icons-material/People'
import { Box, Chip, CircularProgress, Skeleton, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '@/api/ddoAudit'
import LfmParticipantsDialog from '@/components/lfm/LfmParticipantsDialog'
import { PlayerGroup, useCharacter } from '@/contexts/useCharacter'
import { useLfm } from '@/contexts/useLfm'
import { groupCharactersByLocation } from '@/domains/characters/characterGrouping'
import { createLfmByCharacterNameMap, LfmDisplayData, normalizeLfm } from '@/domains/lfm/lfmHelpers'
import { getPlayerDisplayName } from '@/domains/raids/raidLogic'
import { RaidGroup, groupEntriesByPlayer } from '@/domains/raids/raidLogic'

import PlayerCharactersDialog from './dialogs/PlayerCharactersDialog'
import LocationGroupCard from './groups/LocationGroupCard'
import NotInQuestGroupCard from './groups/NotInQuestGroupCard'
import OfflineGroupCard from './groups/OfflineGroupCard'
import QuestGroupCard from './groups/QuestGroupCard'

interface CharactersSectionProps {
  loading: boolean
  hasFetched: boolean
  characterCount: number
  raidGroups: RaidGroup[]
}

export default function CharactersSection({ loading, hasFetched, characterCount, raidGroups }: CharactersSectionProps) {
  const { charactersById, charactersByPlayer } = useCharacter()
  const { lfms } = useLfm()
  const [quests, setQuests] = useState<Record<string, Quest>>({})
  const [areas, setAreas] = useState<Record<string, { id: string, name: string, is_public: boolean, is_wilderness: boolean }>>({})
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState<PlayerGroup | null>(null)
  const [selectedLfm, setSelectedLfm] = useState<LfmDisplayData | null>(null)

  const selectedRaidData = useMemo(() => {
    if (!selectedLfm) return null
    const raidGroup = raidGroups.find((rg) => rg.questId === selectedLfm.questId)
    if (!raidGroup) return null
    const perPlayerEligible = groupEntriesByPlayer(raidGroup.entries, new Date())
    return { raidGroup, perPlayerEligible }
  }, [selectedLfm, raidGroups])

  useEffect(() => {
    fetchQuestsById().then(setQuests).catch(console.error)
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  const preparedLfms = useMemo(() => {
    const map: Record<string, LfmDisplayData> = {}
    Object.entries(lfms).forEach(([id, lfm]) => {
      // Look up quest using lfm.quest_id if available, fallback to id if needed (though usually quest_id is the key for quests)
      // Note: `quests` is keyed by Quest ID. `lfm.quest_id` is the Quest ID.
      const quest = quests[String(lfm.quest_id)] ?? null
      const norm = normalizeLfm(lfm, quest)
      if (norm) {
        map[id] = norm
      }
    })
    return map
  }, [lfms, quests])

  const lfmByCharacterName = useMemo(() => createLfmByCharacterNameMap(preparedLfms), [preparedLfms])

  const handleLfmClick = (lfm: LfmDisplayData) => {
    setSelectedLfm(lfm)
  }

  const groupedCharacters = useMemo(
    () => groupCharactersByLocation({ charactersByPlayer, quests, areas }),
    [charactersByPlayer, quests, areas]
  )

  const {
    publicAreaGroups,
    wildernessAreaGroups,
    notInQuestGroups,
    questGroups,
    questNameToPack,
    questLevels,
    wildernessAreaPacks,
    offlineGroups,
  } = groupedCharacters

  const handlePlayerClick = (group: PlayerGroup) => {
    setSelectedPlayerGroup(group)
  }

  const handleCloseDialog = () => {
    setSelectedPlayerGroup(null)
  }

  // Prepare sorted keys for each category
  const sortedPublicAreas = Object.keys(publicAreaGroups || {}).sort((a, b) => a.localeCompare(b))
  const sortedWildernessAreas = Object.keys(wildernessAreaGroups || {}).sort((a, b) => a.localeCompare(b))
  const sortedQuestNames = Object.keys(questGroups || {}).sort((a, b) => a.localeCompare(b))

  const hasOnlineGroups = sortedPublicAreas.length > 0 || sortedWildernessAreas.length > 0 || sortedQuestNames.length > 0 || notInQuestGroups.length > 0

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon />
          <Typography variant="h5" sx={{ mb: 0 }}>Characters</Typography>
        </Box>
        <Chip label={characterCount} size="small" variant="outlined" />
        {loading && <CircularProgress size={20} />}
      </Box>

      {Object.keys(charactersById ?? {}).length ? (
        <Box sx={{ mt: 2 }}>
          {/* Public areas */}
          <LocationGroupCard
            title="Public Areas"
            groups={publicAreaGroups}
            borderColor="success.main"
            quests={quests}
            areas={areas}
            lfmByCharacterName={lfmByCharacterName}
            onPlayerClick={handlePlayerClick}
            onLfmClick={handleLfmClick}
          />

          {/* Wilderness areas */}
          <LocationGroupCard
            title="Wilderness Areas"
            groups={wildernessAreaGroups}
            borderColor="info.main"
            quests={quests}
            areas={areas}
            lfmByCharacterName={lfmByCharacterName}
            packsByAreaName={wildernessAreaPacks}
            onPlayerClick={handlePlayerClick}
            onLfmClick={handleLfmClick}
          />

          {/* Not in quest */}
          <NotInQuestGroupCard
            groups={notInQuestGroups}
            quests={quests}
            areas={areas}
            lfmByCharacterName={lfmByCharacterName}
            onPlayerClick={handlePlayerClick}
            onLfmClick={handleLfmClick}
          />

          {/* Quests */}
          {sortedQuestNames.map((questName) => (
            <QuestGroupCard
              key={questName}
              questName={questName}
              groups={questGroups[questName] || []}
              packName={questNameToPack[questName] ?? null}
              levelInfo={questLevels[questName] ?? null}
              quests={quests}
              areas={areas}
              lfmByCharacterName={lfmByCharacterName}
              onPlayerClick={handlePlayerClick}
              onLfmClick={handleLfmClick}
            />
          ))}

          {/* Offline */}
          <OfflineGroupCard
            groups={offlineGroups}
            quests={quests}
            areas={areas}
            lfmByCharacterName={lfmByCharacterName}
            showHeader={hasOnlineGroups}
            onPlayerClick={handlePlayerClick}
            onLfmClick={handleLfmClick}
          />
        </Box>
      ) : (loading || !hasFetched) ? (
        <Box sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No character data found.
        </Typography>
      )}

      <PlayerCharactersDialog
        open={!!selectedPlayerGroup}
        onClose={handleCloseDialog}
        playerName={selectedPlayerGroup ? getPlayerDisplayName(selectedPlayerGroup.player) : ''}
        characters={selectedPlayerGroup?.chars ?? []}
      />

      <LfmParticipantsDialog
        selectedLfm={selectedLfm}
        onClose={() => setSelectedLfm(null)}
        selectedRaidData={selectedRaidData}
      />
    </>
  )
}
