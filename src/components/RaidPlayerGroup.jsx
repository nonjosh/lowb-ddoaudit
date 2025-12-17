import {
  addMs,
  formatLocalDateTime,
  formatTimeRemaining,
  RAID_LOCKOUT_MS,
} from '../ddoAuditApi'

import { formatClasses, getPlayerDisplayName, isEntryAvailable } from '../raidLogic'
import CharacterNamesWithClassTooltip from './CharacterNamesWithClassTooltip'

export default function RaidPlayerGroup({ playerGroup, now, collapsed, onToggleCollapsed }) {
  const pg = playerGroup
  const entries = pg.entries ?? []

  // Hide characters below level 30.
  const eligibleEntries = entries.filter((e) => {
    const lvl = e?.totalLevel
    return typeof lvl !== 'number' || lvl >= 30
  })

  const displayEntries = eligibleEntries
    .slice()
    .sort((a, b) => {
      const aAvailable = isEntryAvailable(a, now)
      const bAvailable = isEntryAvailable(b, now)
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1

      // For available characters, sort by level desc.
      if (aAvailable && bAvailable) {
        const aLvl = typeof a?.totalLevel === 'number' ? a.totalLevel : Number.NEGATIVE_INFINITY
        const bLvl = typeof b?.totalLevel === 'number' ? b.totalLevel : Number.NEGATIVE_INFINITY
        if (aLvl !== bLvl) return bLvl - aLvl
        return String(a?.characterName ?? '').localeCompare(String(b?.characterName ?? ''))
      }

      // For unavailable characters, keep a useful order: soonest-to-ready first.
      const aReadyAt = addMs(a?.lastTimestamp, RAID_LOCKOUT_MS)
      const bReadyAt = addMs(b?.lastTimestamp, RAID_LOCKOUT_MS)
      const aRemaining = aReadyAt ? aReadyAt.getTime() - now : Number.POSITIVE_INFINITY
      const bRemaining = bReadyAt ? bReadyAt.getTime() - now : Number.POSITIVE_INFINITY
      if (aRemaining !== bRemaining) return aRemaining - bRemaining
      return String(a?.characterName ?? '').localeCompare(String(b?.characterName ?? ''))
    })
  const availableCount = eligibleEntries.filter((e) => isEntryAvailable(e, now)).length
  const totalCount = eligibleEntries.length

  const collapsedAvailabilityNode = (() => {
    if (!collapsed) return null

    const available = eligibleEntries
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
    for (const e of eligibleEntries) {
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
          <strong>{getPlayerDisplayName(pg.player)}</strong>
          <span className="muted">({availableCount}/{totalCount})</span>
          {collapsed ? collapsedAvailabilityNode : null}
        </div>
      </div>

      {collapsed
        ? null
        : displayEntries.map((e) => {
            const available = isEntryAvailable(e, now)

            const lastCompletionText = formatLocalDateTime(e.lastTimestamp)
            const lastCompletionTitle = `Last completion: ${lastCompletionText}`

            return (
              <div key={e.characterId} className="row">
                <div title={formatClasses(e?.classes)}>{e.characterName}</div>
                <div className="mono">{e.totalLevel ?? '—'}</div>
                <div>{formatClasses(e.classes)}</div>
                <div className="mono lastCompletionCell">
                  {available ? null : (
                    <span
                      className="hoverInfoIcon"
                      title={lastCompletionTitle}
                      aria-label={lastCompletionTitle}
                    >
                      i
                    </span>
                  )}
                </div>
                {(() => {
                  const readyAt = addMs(e.lastTimestamp, RAID_LOCKOUT_MS)
                  const title = readyAt ? readyAt.toLocaleString() : ''
                  const remaining = readyAt ? readyAt.getTime() - now : NaN
                  return (
                    <div className="mono" title={title}>
                      <div>{formatTimeRemaining(remaining)}</div>
                      {available
                        ? null
                        : readyAt
                          ? <div className="muted">{formatLocalDateTime(readyAt)}</div>
                          : null}
                    </div>
                  )
                })()}
              </div>
            )
          })}
    </div>
  )
}
