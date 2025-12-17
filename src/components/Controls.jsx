import { formatLocalDateTime } from '../ddoAuditApi'

export default function Controls({ loading, onRefresh, characterCount, raidCount, lastUpdatedAt, error }) {
  return (
    <section className="controls">
      <div className="actions">
        <button onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
        <div className="meta">
          <span>Characters: {characterCount}</span>
          <span>Raids: {raidCount}</span>
          <span>Updated: {formatLocalDateTime(lastUpdatedAt, { includeSeconds: true })}</span>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
    </section>
  )
}
