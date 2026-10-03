import CoreCard from './CoreCard.jsx'

export default function CoreGrid({ cores, loading, onSelect }) {
  if (loading) {
    return <div className="loading">Loading cores…</div>
  }

  if (cores.length === 0) {
    return <div className="empty">No cores found matching your search.</div>
  }

  return (
    <div className="core-grid">
      {cores.map(core => (
        <CoreCard key={core.id} core={core} onSelect={onSelect} />
      ))}
    </div>
  )
}
