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

function buildRaidGroups({ raidActivity, questsById, charactersById }) {
  /**
   * groupKey: questId
   * value: { questId, raidName, entries: Array<{ characterId, characterName, lastTimestamp }> }
   */
  const groups = new Map()

  for (const item of raidActivity ?? []) {
    const characterId = String(item?.character_id ?? '')
    const ts = item?.timestamp
    const questIds = item?.data?.quest_ids ?? []

    if (!characterId || !ts || !Array.isArray(questIds)) continue

    const characterName = charactersById?.[characterId]?.name ?? characterId

    for (const questIdRaw of questIds) {
      const questId = String(questIdRaw)
      if (!questId) continue

      const raidName = questsById?.[questId]?.name ?? `Unknown quest (${questId})`

      const existing = groups.get(questId) ?? {
        questId,
        raidName,
        entriesByCharacterId: new Map(),
      }

      const prev = existing.entriesByCharacterId.get(characterId)
      if (!prev || new Date(ts).getTime() > new Date(prev.lastTimestamp).getTime()) {
        existing.entriesByCharacterId.set(characterId, {
          characterId,
          characterName,
          lastTimestamp: ts,
        })
      }

      groups.set(questId, existing)
    }
  }

  const normalized = Array.from(groups.values()).map((g) => {
    const entries = Array.from(g.entriesByCharacterId.values()).sort((a, b) => {
      return new Date(a.lastTimestamp).getTime() - new Date(b.lastTimestamp).getTime()
    })
    return { questId: g.questId, raidName: g.raidName, entries }
  })

  normalized.sort((a, b) => a.raidName.localeCompare(b.raidName))
  return normalized
}

function App() {
  const [characterIdsInput, setCharacterIdsInput] = useState(
    '81612777584,81612779875,81612799899,81612840713,111671237122,81612780586,81612811713,111670413405,81612777720,81608349902,81612777715,81612780583,81612782737,81612795666,81612796054,81612796057,81612916723,81613135800,111670322311,111670420969,111671347683,111671727098,111672061714,111673440702,111678077704,180388777114',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [charactersById, setCharactersById] = useState({})
  const [raidActivity, setRaidActivity] = useState([])
  const [questsById, setQuestsById] = useState({})
  const [now, setNow] = useState(() => Date.now())
  const abortRef = useRef(null)

  const characterIds = useMemo(() => parseCharacterIds(characterIdsInput), [characterIdsInput])

  const raidGroups = useMemo(() => {
    return buildRaidGroups({ raidActivity, questsById, charactersById })
  }, [raidActivity, questsById, charactersById])

  async function load() {
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
          <ul className="chips">
            {Object.values(charactersById)
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((c) => (
                <li key={c.id} className="chip">
                  <strong>{c.name}</strong> <span className="muted">({c.server_name})</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">No character data loaded yet.</p>
        )}

        <h2>Raids</h2>
        {!raidGroups.length ? (
          <p className="muted">No raid activity found for those character IDs.</p>
        ) : (
          <div className="raidList">
            {raidGroups.map((g) => (
              <div key={g.questId} className="raidCard">
                <div className="raidTitle">
                  <h3>{g.raidName}</h3>
                  <span className="muted">Quest ID: {g.questId}</span>
                </div>
                <div className="table">
                  <div className="row head">
                    <div>Character</div>
                    <div>Last completion</div>
                    <div>Time remaining</div>
                  </div>
                  {g.entries.map((e) => (
                    <div key={e.characterId} className="row">
                      <div>{e.characterName}</div>
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
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default App
