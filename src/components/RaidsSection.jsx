import RaidCard from './RaidCard'

export default function RaidsSection({ raidGroups, now, isRaidCollapsed, toggleRaidCollapsed, isPlayerCollapsed, togglePlayerCollapsed }) {
  return (
    <>
      <h2>Raids</h2>
      {!raidGroups.length ? (
        <p className="muted">No raid activity found for those character IDs.</p>
      ) : (
        <div className="raidList">
          {raidGroups.map((g) => (
            <div key={g.questId}>
              <RaidCard
                raidGroup={g}
                now={now}
                isRaidCollapsed={isRaidCollapsed(g.questId)}
                onToggleRaid={() => toggleRaidCollapsed(g.questId)}
                isPlayerCollapsed={isPlayerCollapsed}
                onTogglePlayer={togglePlayerCollapsed}
              />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
