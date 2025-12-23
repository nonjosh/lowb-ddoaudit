import { Box, Container, Grid, Paper } from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchCharactersByIds,
  fetchLfms,
  fetchQuestsById,
  fetchRaidActivity,
  parseCharacterIds,
  Quest,
} from './ddoAuditApi'
import {
  buildRaidGroups,
  EXPECTED_PLAYERS,
  getPlayerName,
  groupEntriesByPlayer,
  isEntryAvailable,
} from './raidLogic'

import CharactersSection from './components/characters/CharactersSection'
import Controls from './components/shared/Controls'
import LfmRaidsSection from './components/lfm/LfmRaidsSection'
import RaidTimerSection from './components/raids/RaidTimerSection'

import { CharacterProvider } from './contexts/CharacterContext'

function App() {
  const [characterIdsInput] = useState(
    '81612777584,81612779875,81612799899,81612840713,111670413405,81612796054,81608349902,81612777715,81612777720,81612780583,81612780586,81612782737,81612795666,81612796057,81612811713,81613135800,111670193026,111670322311,111670420969,111670661572,111670702832,111670708744,111671237122,111671347683,111671471817,111671727098,111672061714,111672875879,111678077704,180388777114,180388801443,180388818353,180388822764,81612801618,81612777713,81612840693,180388831263',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [charactersById, setCharactersById] = useState<Record<string, any>>({})
  const [raidActivity, setRaidActivity] = useState<any[]>([])
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})
  const [lfmsById, setLfmsById] = useState<Record<string, any>>({})
  const [lfmError, setLfmError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [collapsedPlayerGroups, setCollapsedPlayerGroups] = useState(() => new Set<string>())
  const [collapsedRaids, setCollapsedRaids] = useState(() => new Set<string>())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [showClassIcons, setShowClassIcons] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const resetRaidCollapseRef = useRef(true)
  const resetRaidCardCollapseRef = useRef(true)
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

  useEffect(() => {
    if (!resetRaidCardCollapseRef.current) return
    if (!raidGroups.length) return

    const next = new Set<string>()
    for (const rg of raidGroups) {
      const perPlayer = groupEntriesByPlayer(rg.entries, now)
      const playerHasAvailable = new Map<string, boolean>()
      for (const pg of perPlayer) {
        const hasAvail = (pg.entries ?? []).some((e) => isEntryAvailable(e, now))
        playerHasAvailable.set(pg.player, hasAvail)
      }

      const allSixAvailable = EXPECTED_PLAYERS.every((p) => playerHasAvailable.get(p) === true)
      if (allSixAvailable) next.add(String(rg.questId))
    }

    setCollapsedRaids(next)
    resetRaidCardCollapseRef.current = false
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

      let lfmFetchError: any = null
      const [quests, characters, raids, lfms] = await Promise.all([
        fetchQuestsById(),
        fetchCharactersByIds(ids, { signal: controller.signal }),
        fetchRaidActivity(ids, { signal: controller.signal }),
        fetchLfms('shadowdale', { signal: controller.signal }).catch((e) => {
          lfmFetchError = e
          return null
        }),
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
    if (!autoRefreshEnabled) return

    const id = setInterval(() => {
      // Avoid constantly aborting in-flight requests; manual refresh can still interrupt.
      if (loadingRef.current) return
      load()
    }, 10_000)

    return () => clearInterval(id)
  }, [autoRefreshEnabled, load])

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
    return collapsedRaids.has(String(questId))
  }, [collapsedRaids])

  const toggleRaidCollapsed = useCallback((questId: string) => {
    const key = String(questId)
    setCollapsedRaids((prev) => {
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
