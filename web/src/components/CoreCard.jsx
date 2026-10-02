export default function CoreCard({ core, onSelect }) {
  const isEmulator = core.categories === 'Emulator'
  const badgeClass = isEmulator ? 'badge badge-emulator' : 'badge badge-game'

  return (
    <div className="core-card" onClick={() => onSelect(core.id)}>
      <div className="core-card-header">
        <span className="core-name">{core.display_name || core.corename || core.id}</span>
        <span className={badgeClass}>{core.categories || 'Unknown'}</span>
      </div>
      {core.systemname && core.systemname !== core.display_name && (
        <div className="core-system">{core.systemname}</div>
      )}
      {core.manufacturer && core.manufacturer !== 'N/A' && (
        <div className="core-manufacturer">{core.manufacturer}</div>
      )}
      <div className="core-card-footer">
        <span className="core-license">{core.license || '—'}</span>
        {core.supports_no_game === 'true' && (
          <span className="core-tag">standalone</span>
        )}
        {core.hw_render === 'true' && (
          <span className="core-tag">hw-render</span>
        )}
        {core.is_experimental === 'true' && (
          <span className="core-tag experimental">experimental</span>
        )}
      </div>
    </div>
  )
}
