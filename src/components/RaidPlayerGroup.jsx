import {
  addMs,
  formatLocalDateTime,
  formatTimeRemaining,
  RAID_LOCKOUT_MS,
} from '../ddoAuditApi'

import { formatClasses, isEntryAvailable } from '../raidLogic'
import CharacterNamesWithClassTooltip from './CharacterNamesWithClassTooltip'

export default function RaidPlayerGroup({ playerGroup, now, collapsed, onToggleCollapsed }) {
  const pg = playerGroup

  const collapsedAvailabilityNode = (() => {
    if (!collapsed) return null

    const available = (pg.entries ?? [])
      .filter((e) => isEntryAvailable(e, now))
      .slice()
      .sort((a, b) => String(a?.characterName ?? '').localeCompare(String(b?.characterName ?? '')))

    if (available.length) {
      const availableItems = available.map((e) => ({
        id: e?.characterId,
        name: e?.characterName,
        classes: e?.classes,
      }))

      return (
        <span className="muted">
          ✅{' '}
          <CharacterNamesWithClassTooltip items={availableItems} />
        </span>
      )
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
      return (
        <span className="muted">
          ❌ Soonest: {soonest.characterName} ({formatTimeRemaining(soonestRemaining)} · {when})
        </span>
      )
    }

    return <span className="muted">❌</span>
  })()

  return (
    <div className="playerSection">
      <div className="row groupRow">
        <div className="groupRowInner">
          <button type="button" className="toggleBtn" onClick={onToggleCollapsed}>
            {collapsed ? 'Show' : 'Hide'}
          </button>
          <strong>{pg.player}</strong>
          <span className="muted">({pg.entries.length})</span>
          {collapsed ? collapsedAvailabilityNode : null}
        </div>
      </div>

      {collapsed
        ? null
        : pg.entries.map((e) => (
            <div key={e.characterId} className="row">
              <div title={formatClasses(e?.classes)}>{e.characterName}</div>
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
}
