import PeopleIcon from '@mui/icons-material/People'
import { Box, Chip, CircularProgress, Skeleton, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

import { fetchAreasById, fetchQuestsById, Quest } from '../../api/ddoAudit'
import { PlayerGroup, useCharacter } from '../../contexts/CharacterContext'
import { groupCharactersByLocation } from '../../domains/characters/characterGrouping'
import { createLfmByCharacterNameMap, prepareLfmParticipants } from '../../domains/lfm/lfmHelpers'
import { getPlayerDisplayName } from '../../domains/raids/raidLogic'
import LfmParticipantsDialog from '../lfm/LfmParticipantsDialog'
import PlayerCharactersDialog from './dialogs/PlayerCharactersDialog'
import LocationGroupCard from './groups/LocationGroupCard'
import NotInQuestGroupCard from './groups/NotInQuestGroupCard'
import OfflineGroupCard from './groups/OfflineGroupCard'
import QuestGroupCard from './groups/QuestGroupCard'

interface CharactersSectionProps {
  loading: boolean
  hasFetched: boolean
  showClassIcons: boolean
  characterCount: number
}

export default function CharactersSection({ loading, hasFetched, showClassIcons, characterCount }: CharactersSectionProps) {
  const { charactersById, charactersByPlayer, lfms } = useCharacter()
  const [quests, setQuests] = useState<Record<string, Quest>>({})
  const [areas, setAreas] = useState<Record<string, { id: string, name: string, is_public: boolean, is_wilderness: boolean }>>({})
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState<PlayerGroup | null>(null)
  const [selectedLfm, setSelectedLfm] = useState<any | null>(null)

  useEffect(() => {
    fetchQuestsById().then(setQuests).catch(console.error)
    fetchAreasById().then(setAreas).catch(console.error)
  }, [])

  const lfmByCharacterName = useMemo(() => createLfmByCharacterNameMap(lfms || {}), [lfms])

  const handleLfmClick = (lfm: any) => {
    const questId = String(lfm?.quest_id ?? '')
    const quest = quests[questId] ?? null
    const preparedLfm = prepareLfmParticipants(lfm, quest)
    setSelectedLfm(preparedLfm)
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
            showClassIcons={showClassIcons}
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
            showClassIcons={showClassIcons}
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
            showClassIcons={showClassIcons}
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
              showClassIcons={showClassIcons}
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
            showClassIcons={showClassIcons}
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
        showClassIcons={showClassIcons}
      />

      <LfmParticipantsDialog
        selectedLfm={selectedLfm}
        onClose={() => setSelectedLfm(null)}
        showClassIcons={showClassIcons}
      />
    </>
  )
}
