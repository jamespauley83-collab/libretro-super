import { useState, useEffect } from 'react'

export default function RecipeBrowser() {
  const [recipes, setRecipes] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => {
        setRecipes(data)
        const platforms = Object.keys(data)
        if (platforms.length > 0) setSelectedPlatform(platforms[0])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading recipes…</div>

  const platforms = Object.keys(recipes).sort()

  return (
    <div className="recipe-browser">
      <div className="platform-tabs">
        {platforms.map(p => (
          <button
            key={p}
            className={`platform-tab ${selectedPlatform === p ? 'active' : ''}`}
            onClick={() => setSelectedPlatform(p)}
          >
            {p}
            <span className="platform-count">
              {recipes[p].reduce((s, f) => s + f.cores.length, 0)}
            </span>
          </button>
        ))}
      </div>

      {selectedPlatform && (
        <div className="recipe-files">
          {recipes[selectedPlatform].map((file, i) => (
            <div key={i} className="recipe-file-group">
              <h3 className="recipe-file-name">{file.name}</h3>
              <table className="recipe-table">
                <thead>
                  <tr>
                    <th>Core</th>
                    <th>Repo</th>
                    <th>Branch</th>
                    <th>Enabled</th>
                    <th>Command</th>
                    <th>Makefile</th>
                    <th>Subdir</th>
                    <th>Args</th>
                  </tr>
                </thead>
                <tbody>
                  {file.cores.map((core, j) => (
                    <tr key={j}>
                      <td className="col-core">{core.corename}</td>
                      <td>
                        {core.url ? (
                          <a href={core.url} target="_blank" rel="noreferrer" className="recipe-link">
                            {core.coredir} ↗
                          </a>
                        ) : core.coredir}
                      </td>
                      <td className="col-branch">{core.branch}</td>
                      <td>
                        <span className={`recipe-status ${core.enabled === 'YES' ? 'enabled' : 'disabled'}`}>
                          {core.enabled}
                        </span>
                      </td>
                      <td className="col-command">{core.command}</td>
                      <td className="col-makefile">{core.makefile}</td>
                      <td className="col-subdir">{core.subdir}</td>
                      <td className="col-args">{core.args || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
