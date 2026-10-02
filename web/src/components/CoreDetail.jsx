import { useState, useEffect } from 'react'

export default function CoreDetail({ corename, onClose }) {
  const [core, setCore] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/cores/${corename}`)
      .then(res => res.json())
      .then(data => {
        setCore(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [corename])

  if (loading) return <div className="modal-overlay"><div className="modal">Loading…</div></div>
  if (!core) return null

  const features = [
    { key: 'supports_no_game', label: 'Standalone (no game needed)' },
    { key: 'savestate', label: 'Save States' },
    { key: 'cheats', label: 'Cheats' },
    { key: 'input_descriptors', label: 'Input Descriptors' },
    { key: 'memory_descriptors', label: 'Memory Descriptors' },
    { key: 'core_options', label: 'Core Options' },
    { key: 'hw_render', label: 'Hardware Rendering' },
    { key: 'needs_fullpath', label: 'Needs Full Path' },
    { key: 'disk_control', label: 'Disk Control' },
    { key: 'is_experimental', label: 'Experimental' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>{core.display_name || core.corename}</h2>
          <span className={`badge ${core.categories === 'Emulator' ? 'badge-emulator' : 'badge-game'}`}>
            {core.categories || 'Unknown'}
          </span>
        </div>

        {core.description && (
          <p className="core-description">{core.description}</p>
        )}

        <div className="modal-section">
          <h3>General</h3>
          <div className="info-grid">
            <InfoRow label="Core Name" value={core.corename} />
            <InfoRow label="Authors" value={core.authors} />
            <InfoRow label="License" value={core.license} />
            <InfoRow label="Version" value={core.display_version} />
            <InfoRow label="Supported Extensions" value={core.supported_extensions || '—'} />
            <InfoRow label="Database" value={core.database} />
          </div>
        </div>

        <div className="modal-section">
          <h3>Hardware</h3>
          <div className="info-grid">
            <InfoRow label="System Name" value={core.systemname || '—'} />
            <InfoRow label="System ID" value={core.systemid || '—'} />
            <InfoRow label="Manufacturer" value={core.manufacturer || '—'} />
          </div>
        </div>

        <div className="modal-section">
          <h3>Libretro Features</h3>
          <div className="feature-list">
            {features.map(f => (
              <div key={f.key} className={`feature ${core[f.key] === 'true' ? 'feature-on' : ''}`}>
                <span className="feature-check">{core[f.key] === 'true' ? '✓' : '○'}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {core.buildRecipes && core.buildRecipes.length > 0 && (
          <div className="modal-section">
            <h3>Build Recipes ({core.buildRecipes.length})</h3>
            <div className="recipe-list">
              {core.buildRecipes.map((r, i) => (
                <div key={i} className="recipe-item">
                  <span className="recipe-platform">{r.platform}</span>
                  <span className="recipe-file">{r.file}</span>
                  <span className={`recipe-status ${r.recipe.enabled === 'YES' ? 'enabled' : 'disabled'}`}>
                    {r.recipe.enabled}
                  </span>
                  <span className="recipe-command">{r.recipe.command}</span>
                  {r.recipe.url && (
                    <a href={r.recipe.url} target="_blank" rel="noreferrer" className="recipe-link">
                      repo ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value || value === 'null') return null
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}
