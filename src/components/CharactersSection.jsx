export default function CharactersSection({ charactersById, charactersByPlayer, isPlayerCollapsed, togglePlayerCollapsed }) {
  return (
    <>
      <h2>Characters</h2>
      {Object.keys(charactersById ?? {}).length ? (
        <div className="playerGroups">
          {charactersByPlayer.map((group) => {
            const collapsed = isPlayerCollapsed(group.player)
            return (
              <div key={group.player} className="playerGroup">
                <div className="groupRowInner">
                  <button
                    type="button"
                    className="toggleBtn"
                    onClick={() => togglePlayerCollapsed(group.player)}
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
    </>
  )
}
