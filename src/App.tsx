import { Box, Container, Grid, Paper } from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchCharactersByIds,
  fetchLfms,
  fetchQuestsById,
  fetchRaidActivity,
  fetchServerInfo,
  parseCharacterIds,
  Quest,
  CharacterData,
  RaidActivityEntry,
} from './api/ddoAudit'
import CharactersSection from './components/characters/CharactersSection'
import LfmRaidsSection from './components/lfm/LfmRaidsSection'
import RaidTimerSection from './components/raids/RaidTimerSection'
import Controls from './components/shared/Controls'
import IdleWarningDialog from './components/shared/IdleWarningDialog'
import { CHARACTERS } from './config/characters'
import { CharacterProvider } from './contexts/CharacterContext'
import {
  buildRaidGroups,
  groupEntriesByPlayer
} from './domains/raids/raidLogic'
import { useIdleTimer } from './hooks/useIdleTimer'
import { useConfig } from './contexts/useConfig'

interface LfmData {
  quest_id?: string
  [key: string]: unknown
}

function App() {
  const [characterIdsInput] = useState(Object.keys(CHARACTERS).join(','))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [charactersById, setCharactersById] = useState<Record<string, CharacterData>>({})
  const [raidActivity, setRaidActivity] = useState<RaidActivityEntry[]>([])
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})
  const [lfmsById, setLfmsById] = useState<Record<string, LfmData>>({})
  const [lfmError, setLfmError] = useState('')
  const [serverPlayers, setServerPlayers] = useState<number | null>(null)
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [collapsedPlayerGroups, setCollapsedPlayerGroups] = useState(() => new Set<string>())
  const [expandedRaids, setExpandedRaids] = useState(() => new Set<string>())
  const abortRef = useRef<AbortController | null>(null)
  const resetRaidCollapseRef = useRef(true)
  const loadingRef = useRef(false)

  const { autoRefreshEnabled } = useConfig()
  const {
    showIdleWarning,
    handleToggleAutoRefresh,
    handleIdleWarningReEnable,
    handleIdleWarningClose,
  } = useIdleTimer()

  const characterIds = useMemo(() => parseCharacterIds(characterIdsInput), [characterIdsInput])

  const raidGroups = useMemo(() => {
    return buildRaidGroups({ raidActivity, questsById, charactersById })
  }, [raidActivity, questsById, charactersById])

  useEffect(() => {
    if (!resetRaidCollapseRef.current) return
    if (!raidGroups.length) return

    const next = new Set<string>()
    for (const rg of raidGroups) {
      const perPlayer = groupEntriesByPlayer(rg.entries, now)
      for (const pg of perPlayer) next.add(`${rg.questId}:${pg.player}`)
    }
    setCollapsedPlayerGroups(next)
    resetRaidCollapseRef.current = false
    // Intentionally include `now` so the dependency list is complete; collapse state only resets when the ref is true.
  }, [raidGroups, now])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')
    setLfmError('')

    try {
      const ids = parseCharacterIds(characterIdsInput)
      if (!ids.length) {
        setError('Enter at least one numeric character id.')
        return
      }

      // Always fetch server info first
      const serverInfo = await fetchServerInfo('shadowdale', { signal: controller.signal }).catch(() => null)
      setIsServerOnline(serverInfo?.is_online ?? null)
      setServerPlayers(serverInfo?.character_count ?? null)


      // If server is offline, avoid calling the LFM API but still fetch quests/characters/raids
      const lfmPromise = serverInfo?.is_online === false
        ? Promise.resolve({ data: null, error: null })
        : fetchLfms('shadowdale', { signal: controller.signal })
          .then((data) => ({ data, error: null }))
          .catch((e: Error) => ({ data: null, error: e }))

      if (serverInfo?.is_online === false) {
        setLfmError('Server is offline. LFM data is unavailable.')
      }

      const [quests, characters, raids, lfmResult] = await Promise.all([
        fetchQuestsById(),
        fetchCharactersByIds(ids, { signal: controller.signal }),
        fetchRaidActivity(ids, { signal: controller.signal }),
        lfmPromise,
      ])

      if (lfmResult.error) {
        setLfmError(lfmResult.error.message ?? String(lfmResult.error))
      }

      setQuestsById(quests)
      setCharactersById(characters as Record<string, CharacterData>)
      setRaidActivity(raids as RaidActivityEntry[])
      setLfmsById((lfmResult.data ?? {}) as Record<string, LfmData>)
      setLastUpdatedAt(new Date())
    } catch (e) {
      const error = e as Error
      if (error?.name === 'AbortError') return
      setError(error?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [characterIdsInput])

  useEffect(() => {
    // Initial load using the default sample IDs.
    load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    if (!autoRefreshEnabled || isServerOnline === false) return

    const id = setInterval(() => {
      if (loadingRef.current) return
      load()
    }, 10_000)

    return () => clearInterval(id)
  }, [autoRefreshEnabled, load, isServerOnline])

  const isCollapsed = useCallback((questId: string, playerName: string) => {
    return collapsedPlayerGroups.has(`${questId}:${playerName}`)
  }, [collapsedPlayerGroups])

  const toggleCollapsed = useCallback((questId: string, playerName: string) => {
    const key = `${questId}:${playerName}`
    setCollapsedPlayerGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const isRaidCollapsed = useCallback((questId: string) => {
    return !expandedRaids.has(String(questId))
  }, [expandedRaids])

  const toggleRaidCollapsed = useCallback((questId: string) => {
    const key = String(questId)
    setExpandedRaids((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  return (
    <CharacterProvider charactersById={charactersById} lfms={lfmsById} raidActivity={raidActivity} questsById={questsById}>
      <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
        <Controls
          loading={loading}
          onRefresh={load}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={handleToggleAutoRefresh}
          lastUpdatedAt={lastUpdatedAt}
          error={error}
        />

        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 4, md: 3, lg: 2.5 }}>
              <Paper sx={{
                p: 2,
                position: 'sticky',
                top: 16,
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto'
              }}>
                <CharactersSection
                  loading={loading}
                  hasFetched={!!lastUpdatedAt}
                  characterCount={characterIds.length}
                />
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 8, md: 9, lg: 9.5 }}>
              <Box sx={{ mb: 3 }}>
                <LfmRaidsSection
                  loading={loading}
                  hasFetched={!!lastUpdatedAt}
                  lfmsById={lfmsById}
                  questsById={questsById}
                  error={lfmError}
                  serverPlayers={serverPlayers}
                  isServerOnline={isServerOnline}
                  raidGroups={raidGroups}
                />
              </Box>
              <RaidTimerSection
                loading={loading}
                hasFetched={!!lastUpdatedAt}
                raidGroups={raidGroups}
                isRaidCollapsed={isRaidCollapsed}
                toggleRaidCollapsed={toggleRaidCollapsed}
                isPlayerCollapsed={isCollapsed}
                togglePlayerCollapsed={toggleCollapsed}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>
      <IdleWarningDialog
        open={showIdleWarning}
        onReEnable={handleIdleWarningReEnable}
        onClose={handleIdleWarningClose}
      />
    </CharacterProvider>
  )
}

export default App
