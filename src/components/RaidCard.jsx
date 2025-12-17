import { EXPECTED_PLAYERS, groupEntriesByPlayer, isEntryAvailable } from '../raidLogic'
import { getRaidNotesForRaidName } from '../raidNotes'
import RaidPlayerGroup from './RaidPlayerGroup'

export default function RaidCard({ raidGroup, now, isRaidCollapsed, onToggleRaid, isPlayerCollapsed, onTogglePlayer }) {
  const g = raidGroup
  const perPlayer = groupEntriesByPlayer(g.entries, now)
  const raidNotes = getRaidNotesForRaidName(g.raidName)

  const renderNotesField = (label, items) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : []
    if (list.length === 0) return null
    if (list.length === 1) {
      return (
        <div className="raidNotesRow">
          <span className="muted">{label}:</span> {list[0]}
        </div>
      )
    }
    return (
      <div className="raidNotesRow">
        <span className="muted">{label}:</span>
        <ul className="raidNotesList">
          {list.map((x, idx) => (
            <li key={`${label}-${idx}`}>{x}</li>
          ))}
        </ul>
      </div>
    )
  }

  const isEligibleEntry = (e) => {
    const lvl = e?.totalLevel
    return typeof lvl !== 'number' || lvl >= 30
  }

  const perPlayerEligible = perPlayer
    .map((pg) => ({ ...pg, entries: (pg.entries ?? []).filter(isEligibleEntry) }))
    .filter((pg) => (pg.entries ?? []).length > 0)

  const availablePlayers = EXPECTED_PLAYERS.filter((playerName) => {
    const pg = perPlayerEligible.find((p) => p.player === playerName)
    return pg ? (pg.entries ?? []).some((e) => isEntryAvailable(e, now)) : false
  }).length

  return (
    <div className="raidCard">
      <div className="raidTitle">
        <h3>{g.raidName}</h3>
        <span className="muted">
          Level: {typeof g.questLevel === 'number' ? g.questLevel : '—'} · Quest ID: {g.questId}
        </span>
        <span className={availablePlayers === EXPECTED_PLAYERS.length ? 'muted allAvailable' : 'muted'}>
          Available players: {availablePlayers}/{EXPECTED_PLAYERS.length}
        </span>
        <button type="button" className="toggleBtn" onClick={onToggleRaid}>
          {isRaidCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {raidNotes ? (
        <div className="raidNotes">
          {renderNotesField('Augment', raidNotes.augments)}
          {renderNotesField('Set', raidNotes.sets)}
          {renderNotesField('Notes', raidNotes.notes)}
        </div>
      ) : null}

      {isRaidCollapsed ? null : (
        <div className="table">
          <div className="row head">
            <div>Character</div>
            <div>Level</div>
            <div>Classes</div>
            <div>Last completion</div>
            <div>Time remaining</div>
          </div>

          {perPlayerEligible.map((pg) => {
            const collapsed = isPlayerCollapsed(g.questId, pg.player)
            return (
              <RaidPlayerGroup
                key={pg.player}
                playerGroup={pg}
                now={now}
                collapsed={collapsed}
                onToggleCollapsed={() => onTogglePlayer(g.questId, pg.player)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
