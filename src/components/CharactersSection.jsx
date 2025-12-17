import { formatClasses } from '../raidLogic'
import CharacterNamesWithClassTooltip from './CharacterNamesWithClassTooltip'

export default function CharactersSection({ charactersById, charactersByPlayer, isPlayerCollapsed, togglePlayerCollapsed }) {
  const onlineCharacters = Object.values(charactersById ?? {})
    .filter((c) => c?.is_online)
    .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')))

  return (
    <>
      <h2>Characters</h2>

      <p className="muted">
        Online:{' '}
        {onlineCharacters.length
          ? onlineCharacters
              .map((c) => {
                const classes = formatClasses(c?.classes)
                return `${c?.name ?? 'Unknown'} (${classes})`
              })
              .join(', ')
          : '—'}
      </p>

      {Object.keys(charactersById ?? {}).length ? (
        <div className="playerGroups">
          {charactersByPlayer.map((group) => {
            const collapsed = isPlayerCollapsed(group.player)
            const onlineForPlayer = (group.chars ?? [])
              .filter((c) => c?.is_online)
              .slice()
              .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')))

            const onlineForPlayerItems = onlineForPlayer.map((c) => ({
              id: c?.id,
              name: c?.name,
              classes: c?.classes,
            }))

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
                  {collapsed && onlineForPlayer.length ? (
                    <span className="muted">
                      🟢{' '}
                      <CharacterNamesWithClassTooltip items={onlineForPlayerItems} />
                    </span>
                  ) : null}
                </div>

                {collapsed ? null : (
                  <ul className="chips">
                    {group.chars.map((c) => (
                      <li
                        key={c.id}
                        className="chip"
                      >
                        <strong>
                          {c.name}
                          {c.is_online ? ' 🟢' : null}
                        </strong>{' '}
                        <span className="muted">({formatClasses(c?.classes)})</span>
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
