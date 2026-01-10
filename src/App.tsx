import { Box, Container, Grid, Paper } from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchCharactersByIds,
  fetchQuestsById,
  fetchRaidActivity,
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
import { GearPlannerProvider } from './contexts/GearPlannerContext'
import { LfmProvider } from './contexts/LfmContext'
import { useLfm } from './contexts/useLfm'
import {
  buildRaidGroups,
  groupEntriesByPlayer
} from './domains/raids/raidLogic'
import { useIdleTimer } from './hooks/useIdleTimer'
import { useConfig } from './contexts/useConfig'

function Dashboard() {
  const [characterIdsInput] = useState(Object.keys(CHARACTERS).join(','))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [charactersById, setCharactersById] = useState<Record<string, CharacterData>>({})
  const [raidActivity, setRaidActivity] = useState<RaidActivityEntry[]>([])
  const [questsById, setQuestsById] = useState<Record<string, Quest>>({})
  const [now, setNow] = useState(() => new Date())
  const [collapsedPlayerGroups, setCollapsedPlayerGroups] = useState(() => new Set<string>())
  const [expandedRaids, setExpandedRaids] = useState(() => new Set<string>())
  const abortRef = useRef<AbortController | null>(null)
  const resetRaidCollapseRef = useRef(true)
  const loadingRef = useRef(false)

  const { autoRefreshEnabled } = useConfig()
  const { refresh: refreshLfm, serverInfo, loading: lfmLoading } = useLfm()
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
  }, [raidGroups, now])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError('')

    try {
      const ids = parseCharacterIds(characterIdsInput)
      if (!ids.length) {
        setError('Enter at least one numeric character id.')
        return
      }

      const [quests, characters, raids] = await Promise.all([
        fetchQuestsById(),
        fetchCharactersByIds(ids, { signal: controller.signal }),
        fetchRaidActivity(ids, { signal: controller.signal }),
        refreshLfm(controller.signal).catch(() => { }), // Allow this to fail silently as LfmContext handles error
      ])

      setQuestsById(quests)
      setCharactersById(characters)
      setRaidActivity(raids)
      setLastUpdatedAt(new Date())
    } catch (e) {
      const error = e as Error
      if (error?.name === 'AbortError') return
      setError(error?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [characterIdsInput, refreshLfm])

  useEffect(() => {
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
    if (!autoRefreshEnabled || serverInfo.isOnline === false) return

    const id = setInterval(() => {
      if (loadingRef.current) return
      load()
    }, 10_000)

    return () => clearInterval(id)
  }, [autoRefreshEnabled, load, serverInfo.isOnline])

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
    <CharacterProvider charactersById={charactersById} raidActivity={raidActivity} questsById={questsById}>
      <Container maxWidth={false} sx={{ py: 4, px: 2 }}>
        <Controls
          loading={loading || lfmLoading}
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
                  raidGroups={raidGroups}
                />
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, sm: 8, md: 9, lg: 9.5 }}>
              <Box sx={{ mb: 3 }}>
                <LfmRaidsSection
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

function App() {
  return (
    <LfmProvider>
      <GearPlannerProvider>
        <Dashboard />
      </GearPlannerProvider>
    </LfmProvider>
  )
}

export default App
