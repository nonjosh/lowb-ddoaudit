import {
  addMs,
  formatLocalDateTime,
  formatTimeRemaining,
  RAID_LOCKOUT_MS,
} from '../ddoAuditApi'

import { formatClasses, isEntryAvailable } from '../raidLogic'

export default function RaidPlayerGroup({ playerGroup, now, collapsed, onToggleCollapsed }) {
  const pg = playerGroup

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
    <div className="playerSection">
      <div className="row groupRow">
        <div className="groupRowInner">
          <button type="button" className="toggleBtn" onClick={onToggleCollapsed}>
            {collapsed ? 'Show' : 'Hide'}
          </button>
          <strong>{pg.player}</strong>
          <span className="muted">({pg.entries.length})</span>
          {collapsed ? <span className="muted">{collapsedAvailabilityText}</span> : null}
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
}
