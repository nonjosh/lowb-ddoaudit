import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import {
  addMs,
  fetchCharactersByIds,
  fetchQuestsById,
  fetchRaidActivity,
  formatLocalDateTime,
  formatTimeRemaining,
  RAID_LOCKOUT_MS,
  parseCharacterIds,
} from './ddoAuditApi'

const PLAYER_BY_CHARACTER_NAME = {
  // Johnson
  nonjosh: 'Johnson',
  nonjoshii: 'Johnson',
  nonjoshiv: 'Johnson',
  mvppiker: 'Johnson',

  // Jonah
  zenser: 'Jonah',
  zenrar: 'Jonah',
  zertiar: 'Jonah',
  zevkar: 'Jonah',

  // Michael
  garei: 'Michael',
  tareos: 'Michael',
  karc: 'Michael',

  // Ken
  kenami: 'Ken',
  nekamisama: 'Ken',
  nekami: 'Ken',
  amiken: 'Ken',
  feldspars: 'Ken',
  waven: 'Ken',
  fatslayer: 'Ken',
  fateslayer: 'Ken',
  temor: 'Ken',

  // Renz
  hako: 'Renz',
  renz: 'Renz',
  okah: 'Renz',
  zner: 'Renz',
  zneri: 'Renz',
  znerii: 'Renz',
  zneriii: 'Renz',
  znery: 'Renz',

  // old mic
  ctenmiir: 'old mic',
  keviamin: 'old mic',
  graceella : 'old mic',
  castra: 'old mic',
}

const MIN_CHARACTER_LEVEL = 28
const EXPECTED_PLAYERS = ['Johnson', 'Jonah', 'Michael', 'Ken', 'Renz', 'old mic']

function getPlayerName(characterName) {
  const key = String(characterName ?? '').trim().toLowerCase()
  if (!key) return 'Unknown'
  return PLAYER_BY_CHARACTER_NAME[key] ?? 'Unknown'
}

function groupEntriesByPlayer(entries, now) {
  /** @type {Map<string, any[]>} */
  const map = new Map()
  for (const e of entries ?? []) {
    const player = e?.playerName ?? 'Unknown'
    const arr = map.get(player) ?? []
    arr.push(e)
    map.set(player, arr)
  }

  const groups = Array.from(map.entries()).map(([player, list]) => {
    const sorted = list.slice().sort((a, b) => {
      const aHasTimer = Boolean(a?.lastTimestamp)
      const bHasTimer = Boolean(b?.lastTimestamp)
      if (aHasTimer !== bHasTimer) return aHasTimer ? 1 : -1

      const aReadyAt = addMs(a.lastTimestamp, RAID_LOCKOUT_MS)
      const bReadyAt = addMs(b.lastTimestamp, RAID_LOCKOUT_MS)
      const aRemaining = aReadyAt ? aReadyAt.getTime() - now : Number.POSITIVE_INFINITY
      const bRemaining = bReadyAt ? bReadyAt.getTime() - now : Number.POSITIVE_INFINITY

      // Asc: less time remaining first.
      const byRemaining = aRemaining - bRemaining
      if (byRemaining !== 0) return byRemaining

      return String(a.characterName).localeCompare(String(b.characterName))
    })
    return { player, entries: sorted }
  })

  groups.sort((a, b) => {
    if (a.player === 'Unknown' && b.player !== 'Unknown') return 1
    if (b.player === 'Unknown' && a.player !== 'Unknown') return -1
    return a.player.localeCompare(b.player)
  })

  return groups
}

function formatClasses(classes) {
  const list = Array.isArray(classes) ? classes : []
  const filtered = list.filter((c) => c?.name && c?.name !== 'Epic' && c?.name !== 'Legendary')
  if (!filtered.length) return '—'
  return filtered.map((c) => `${c.name} ${c.level}`).join(', ')
}

function isEntryAvailable(entry, now) {
  const readyAt = addMs(entry?.lastTimestamp, RAID_LOCKOUT_MS)
  if (!readyAt) return true
  return readyAt.getTime() - now <= 0
}

function buildRaidGroups({ raidActivity, questsById, charactersById }) {
  /**
   * groupKey: questId
  * value: { questId, raidName, questLevel, entries: Array<{ characterId, characterName, playerName, lastTimestamp }> }
   */
  const groups = new Map()

  for (const item of raidActivity ?? []) {
    const characterId = String(item?.character_id ?? '')
    const ts = item?.timestamp
    const questIds = item?.data?.quest_ids ?? []

    if (!characterId || !ts || !Array.isArray(questIds)) continue

    const character = charactersById?.[characterId]
    const totalLevel = character?.total_level ?? null
    if (typeof totalLevel === 'number' && totalLevel < MIN_CHARACTER_LEVEL) continue

    const characterName = character?.name ?? characterId
    const playerName = getPlayerName(characterName)
    const classes = character?.classes ?? []

    for (const questIdRaw of questIds) {
      const questId = String(questIdRaw)
      if (!questId) continue

      const raidName = questsById?.[questId]?.name ?? `Unknown quest (${questId})`
      const questLevel = questsById?.[questId]?.level ?? null
      if (typeof questLevel === 'number' && questLevel < 20) continue

      const existing = groups.get(questId) ?? {
        questId,
        raidName,
        questLevel,
        entriesByCharacterId: new Map(),
      }

      const prev = existing.entriesByCharacterId.get(characterId)
      if (!prev || new Date(ts).getTime() > new Date(prev.lastTimestamp).getTime()) {
        existing.entriesByCharacterId.set(characterId, {
          characterId,
          characterName,
          playerName,
          totalLevel,
          classes,
          lastTimestamp: ts,
        })
      }

      groups.set(questId, existing)
    }
  }

  // Add placeholder entries for characters with no timer for this raid.
  const allCharacterIds = Object.keys(charactersById ?? {})
    .map(String)
    .filter((id) => {
      const lvl = charactersById?.[id]?.total_level
      return typeof lvl !== 'number' || lvl >= MIN_CHARACTER_LEVEL
    })
  for (const g of groups.values()) {
    for (const characterId of allCharacterIds) {
      if (g.entriesByCharacterId.has(characterId)) continue
      const character = charactersById?.[characterId]
      const characterName = character?.name ?? characterId
      const playerName = getPlayerName(characterName)
      const totalLevel = character?.total_level ?? null
      const classes = character?.classes ?? []
      g.entriesByCharacterId.set(characterId, {
        characterId,
        characterName,
        playerName,
        totalLevel,
        classes,
        lastTimestamp: null,
      })
    }
  }

  const normalized = Array.from(groups.values()).map((g) => {
    const entries = Array.from(g.entriesByCharacterId.values()).sort((a, b) => {
      const byPlayer = String(a.playerName).localeCompare(String(b.playerName))
      if (byPlayer !== 0) return byPlayer
      const byName = String(a.characterName).localeCompare(String(b.characterName))
      if (byName !== 0) return byName
      if (!a.lastTimestamp && b.lastTimestamp) return -1
      if (!b.lastTimestamp && a.lastTimestamp) return 1
      if (!a.lastTimestamp && !b.lastTimestamp) return 0
      return new Date(a.lastTimestamp).getTime() - new Date(b.lastTimestamp).getTime()
    })
    return { questId: g.questId, raidName: g.raidName, questLevel: g.questLevel ?? null, entries }
  })

  normalized.sort((a, b) => {
    const aLevel = typeof a.questLevel === 'number' ? a.questLevel : -1
    const bLevel = typeof b.questLevel === 'number' ? b.questLevel : -1
    if (aLevel !== bLevel) return bLevel - aLevel
    return a.raidName.localeCompare(b.raidName)
  })
  return normalized
}

function App() {
  const [characterIdsInput, setCharacterIdsInput] = useState(
    '81612777584,81612779875,81612799899,81612840713,111670413405,81612796054,81608349902,81612777715,81612777720,81612780583,81612780586,81612782737,81612795666,81612796057,81612811713,81613135800,111670193026,111670322311,111670420969,111670661572,111670702832,111670708744,111671237122,111671347683,111671471817,111671727098,111672061714,111672875879,111678077704,180388777114,180388801443,180388818353,180388822764',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [charactersById, setCharactersById] = useState({})
  const [raidActivity, setRaidActivity] = useState([])
  const [questsById, setQuestsById] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const [collapsedPlayerGroups, setCollapsedPlayerGroups] = useState(() => new Set())
  const [collapsedCharacterPlayers, setCollapsedCharacterPlayers] = useState(() => new Set())
  const [collapsedRaids, setCollapsedRaids] = useState(() => new Set())
  const abortRef = useRef(null)
  const resetCharacterCollapseRef = useRef(true)
  const resetRaidCollapseRef = useRef(true)
  const resetRaidCardCollapseRef = useRef(true)

  const characterIds = useMemo(() => parseCharacterIds(characterIdsInput), [characterIdsInput])

  const raidGroups = useMemo(() => {
    return buildRaidGroups({ raidActivity, questsById, charactersById })
  }, [raidActivity, questsById, charactersById])

  const charactersByPlayer = useMemo(() => {
    const values = Object.values(charactersById ?? {}).filter((c) => {
      const lvl = c?.total_level
      return typeof lvl !== 'number' || lvl >= MIN_CHARACTER_LEVEL
    })
    /** @type {Map<string, any[]>} */
    const map = new Map()
    for (const c of values) {
      const player = getPlayerName(c?.name)
      const arr = map.get(player) ?? []
      arr.push(c)
      map.set(player, arr)
    }

    const groups = Array.from(map.entries()).map(([player, chars]) => {
      const sorted = chars.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)))
      return { player, chars: sorted }
    })

    groups.sort((a, b) => {
      if (a.player === 'Unknown' && b.player !== 'Unknown') return 1
      if (b.player === 'Unknown' && a.player !== 'Unknown') return -1
      return a.player.localeCompare(b.player)
    })
    return groups
  }, [charactersById])

  useEffect(() => {
    if (!resetCharacterCollapseRef.current) return
    if (!charactersByPlayer.length) return
    setCollapsedCharacterPlayers(new Set(charactersByPlayer.map((g) => g.player)))
    resetCharacterCollapseRef.current = false
  }, [charactersByPlayer])

  useEffect(() => {
    if (!resetRaidCollapseRef.current) return
    if (!raidGroups.length) return

    const next = new Set()
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

    const next = new Set()
    for (const rg of raidGroups) {
      const perPlayer = groupEntriesByPlayer(rg.entries, now)
      /** @type {Map<string, boolean>} */
      const playerHasAvailable = new Map()
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

  async function load() {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    resetCharacterCollapseRef.current = true
    resetRaidCollapseRef.current = true
    resetRaidCardCollapseRef.current = true

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
      ])

      setQuestsById(quests)
      setCharactersById(characters)
      setRaidActivity(raids)
    } catch (e) {
      if (e?.name === 'AbortError') return
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load using the default sample IDs.
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  function isCollapsed(questId, playerName) {
    return collapsedPlayerGroups.has(`${questId}:${playerName}`)
  }

  function toggleCollapsed(questId, playerName) {
    const key = `${questId}:${playerName}`
    setCollapsedPlayerGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isCharacterPlayerCollapsed(playerName) {
    return collapsedCharacterPlayers.has(playerName)
  }

  function toggleCharacterPlayerCollapsed(playerName) {
    setCollapsedCharacterPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(playerName)) next.delete(playerName)
      else next.add(playerName)
      return next
    })
  }

  function isRaidCollapsed(questId) {
    return collapsedRaids.has(String(questId))
  }

  function toggleRaidCollapsed(questId) {
    const key = String(questId)
    setCollapsedRaids((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <>
      <header className="header">
        <h1>DDO Audit Raid Timers (Grouped by Raid)</h1>
        <p className="subtitle">
          Paste character IDs, then load. Results are grouped by raid name and show each
          character’s most recent completion timestamp. Lockout is assumed to be 2 days 18 hours.
        </p>
      </header>

      <section className="controls">
        <label className="label" htmlFor="characterIds">
          Character IDs (comma or whitespace separated)
        </label>
        <textarea
          id="characterIds"
          className="textarea"
          value={characterIdsInput}
          onChange={(e) => setCharacterIdsInput(e.target.value)}
          rows={3}
          spellCheck={false}
        />
        <div className="actions">
          <button onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Load timers'}
          </button>
          <div className="meta">
            <span>Characters: {characterIds.length}</span>
            <span>Raids: {raidGroups.length}</span>
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="results">
        <h2>Characters</h2>
        {Object.keys(charactersById ?? {}).length ? (
          <div className="playerGroups">
            {charactersByPlayer.map((group) => {
              const collapsed = isCharacterPlayerCollapsed(group.player)
              return (
                <div key={group.player} className="playerGroup">
                  <div className="groupRowInner">
                    <button
                      type="button"
                      className="toggleBtn"
                      onClick={() => toggleCharacterPlayerCollapsed(group.player)}
                    >
                      {collapsed ? 'Show' : 'Hide'}
                    </button>
                    <strong>{group.player}</strong>
                    <span className="muted">({group.chars.length})</span>
                  </div>

                  {collapsed ? null : (
                    <ul className="chips">
                      {group.chars.map((c) => (
                        <li key={c.id} className="chip">
                          <strong>{c.name}</strong> <span className="muted">({c.server_name})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="muted">No character data loaded yet.</p>
        )}

        <h2>Raids</h2>
        {!raidGroups.length ? (
          <p className="muted">No raid activity found for those character IDs.</p>
        ) : (
          <div className="raidList">
            {raidGroups.map((g) => {
              const perPlayer = groupEntriesByPlayer(g.entries, now)
              const availablePlayers = EXPECTED_PLAYERS.filter((playerName) => {
                const pg = perPlayer.find((p) => p.player === playerName)
                return pg ? (pg.entries ?? []).some((e) => isEntryAvailable(e, now)) : false
              }).length

              return (
                <div key={g.questId} className="raidCard">
                  <div className="raidTitle">
                    <h3>{g.raidName}</h3>
                    <span className="muted">
                      Level: {typeof g.questLevel === 'number' ? g.questLevel : '—'} · Quest ID:{' '}
                      {g.questId}
                    </span>
                      <span
                        className={
                          availablePlayers === EXPECTED_PLAYERS.length ? 'muted allAvailable' : 'muted'
                        }
                      >
                        Available players: {availablePlayers}/{EXPECTED_PLAYERS.length}
                      </span>
                    <button
                      type="button"
                      className="toggleBtn"
                      onClick={() => toggleRaidCollapsed(g.questId)}
                    >
                      {isRaidCollapsed(g.questId) ? 'Show' : 'Hide'}
                    </button>
                  </div>

                  {isRaidCollapsed(g.questId) ? null : (
                    <div className="table">
                      <div className="row head">
                        <div>Character</div>
                        <div>Level</div>
                        <div>Classes</div>
                        <div>Last completion</div>
                        <div>Time remaining</div>
                      </div>
                      {perPlayer.map((pg) => {
                        const collapsed = isCollapsed(g.questId, pg.player)
                        const collapsedAvailabilityText = (() => {
                          if (!collapsed) return ''

                          const available = (pg.entries ?? []).filter((e) => isEntryAvailable(e, now))
                          if (available.length) {
                            const availableNames = available
                              .map((e) => e.characterName)
                              .sort((a, b) => String(a).localeCompare(String(b)))
                            return availableNames.map((n) => `✅ ${n}`).join(', ')
                          }

                          // None available: show a ❌ plus the soonest-to-be-available character.
                          let soonest = null
                          let soonestRemaining = Number.POSITIVE_INFINITY
                          let soonestReadyAt = null
                          for (const e of pg.entries ?? []) {
                            const readyAt = addMs(e?.lastTimestamp, RAID_LOCKOUT_MS)
                            if (!readyAt) continue
                            const remaining = readyAt.getTime() - now
                            if (remaining > 0 && remaining < soonestRemaining) {
                              soonest = e
                              soonestRemaining = remaining
                              soonestReadyAt = readyAt
                            }
                          }

                          if (soonest) {
                            const when = soonestReadyAt ? formatLocalDateTime(soonestReadyAt) : '—'
                            return `❌ Soonest: ${soonest.characterName} (${formatTimeRemaining(soonestRemaining)} · ${when})`
                          }
                          return '❌'
                        })()

                        return (
                          <div key={pg.player} className="playerSection">
                            <div className="row groupRow">
                              <div className="groupRowInner">
                                <button
                                  type="button"
                                  className="toggleBtn"
                                  onClick={() => toggleCollapsed(g.questId, pg.player)}
                                >
                                  {collapsed ? 'Show' : 'Hide'}
                                </button>
                                <strong>{pg.player}</strong>
                                <span className="muted">({pg.entries.length})</span>
                                {collapsed ? (
                                  <span className="muted">{collapsedAvailabilityText}</span>
                                ) : null}
                              </div>
                            </div>

                            {collapsed
                              ? null
                              : pg.entries.map((e) => (
                                  <div key={e.characterId} className="row">
                                    <div>{e.characterName}</div>
                                    <div className="mono">{e.totalLevel ?? '—'}</div>
                                    <div>{formatClasses(e.classes)}</div>
                                    <div className="mono">{formatLocalDateTime(e.lastTimestamp)}</div>
                                    {(() => {
                                      const readyAt = addMs(e.lastTimestamp, RAID_LOCKOUT_MS)
                                      const title = readyAt ? readyAt.toLocaleString() : ''
                                      const remaining = readyAt ? readyAt.getTime() - now : NaN
                                      return (
                                        <div className="mono" title={title}>
                                          {formatTimeRemaining(remaining)}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default App
