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
} from './api/ddoAudit'
import { CHARACTERS } from './config/characters'
import {
  buildRaidGroups,
  groupEntriesByPlayer
} from './domains/raids/raidLogic'

import CharactersSection from './components/characters/CharactersSection'
import LfmRaidsSection from './components/lfm/LfmRaidsSection'
import RaidTimerSection from './components/raids/RaidTimerSection'
import Controls from './components/shared/Controls'

import { CharacterProvider } from './contexts/CharacterContext'

function App() {
  const [characterIdsInput] = useState(Object.keys(CHARACTERS).join(','))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [charactersById, setCharactersById] = useState<Record<string, any>>({})
  const [raidActivity, setRaidActivity] = useState<any[]>([])
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})
  const [lfmsById, setLfmsById] = useState<Record<string, any>>({})
  const [lfmError, setLfmError] = useState('')
  const [serverPlayers, setServerPlayers] = useState<number | null>(null)
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [collapsedPlayerGroups, setCollapsedPlayerGroups] = useState(() => new Set<string>())
  const [expandedRaids, setExpandedRaids] = useState(() => new Set<string>())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [showClassIcons, setShowClassIcons] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const resetRaidCollapseRef = useRef(true)
  const loadingRef = useRef(false)

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
      let lfmFetchError: any = null
      const lfmPromise = serverInfo?.is_online === false
        ? Promise.resolve(null)
        : fetchLfms('shadowdale', { signal: controller.signal }).catch((e) => {
          lfmFetchError = e
          return null
        })

      if (serverInfo?.is_online === false) {
        setLfmError('Server is offline. LFM data is unavailable.')
      }

      const [quests, characters, raids, lfms] = await Promise.all([
        fetchQuestsById(),
        fetchCharactersByIds(ids, { signal: controller.signal }),
        fetchRaidActivity(ids, { signal: controller.signal }),
        lfmPromise,
      ])

      if (lfmFetchError) {
        setLfmError(lfmFetchError?.message ?? String(lfmFetchError))
      }

      setQuestsById(quests)
      setCharactersById(characters)
      setRaidActivity(raids)
      setLfmsById(lfms ?? {})
      setLastUpdatedAt(new Date())
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError(e?.message ?? String(e))
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
    <CharacterProvider charactersById={charactersById} lfms={lfmsById}>
      <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
        <Controls
          loading={loading}
          onRefresh={load}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={() => setAutoRefreshEnabled((v) => !v)}
          showClassIcons={showClassIcons}
          onToggleShowClassIcons={() => setShowClassIcons((v) => !v)}
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
                  showClassIcons={showClassIcons}
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
                  showClassIcons={showClassIcons}
                  serverPlayers={serverPlayers}
                  isServerOnline={isServerOnline}
                />
              </Box>
              <RaidTimerSection
                loading={loading}
                hasFetched={!!lastUpdatedAt}
                raidGroups={raidGroups}
                now={now ?? new Date()}
                isRaidCollapsed={isRaidCollapsed}
                toggleRaidCollapsed={toggleRaidCollapsed}
                isPlayerCollapsed={isCollapsed}
                togglePlayerCollapsed={toggleCollapsed}
                showClassIcons={showClassIcons}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </CharacterProvider>
  )
}

export default App
