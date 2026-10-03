import { useState, useEffect, useMemo } from 'react'
import Header from './components/Header.jsx'
import StatsBar from './components/StatsBar.jsx'
import CoreGrid from './components/CoreGrid.jsx'
import CoreDetail from './components/CoreDetail.jsx'
import RecipeBrowser from './components/RecipeBrowser.jsx'

export default function App() {
  const [cores, setCores] = useState([])
  const [totalCores, setTotalCores] = useState(0)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [selectedCoreId, setSelectedCoreId] = useState(null)
  const [tab, setTab] = useState('cores')

  useEffect(() => {
    let current = true
    async function fetchCores() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (category) params.set('category', category)
        const res = await fetch(`/api/cores?${params}`)
        if (!res.ok) throw new Error('Failed to fetch cores')
        const data = await res.json()
        if (current) {
          setCores(data.cores)
          setTotalCores(data.total)
        }
      } catch (e) {
        if (current) setError(e.message)
      } finally {
        if (current) setLoading(false)
      }
    }
    fetchCores()
    return () => { current = false }
  }, [search, category])

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const categories = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [stats])

  return (
    <div className="app">
      <Header tab={tab} setTab={setTab} />
      {stats && <StatsBar stats={stats} />}

      {tab === 'cores' && (
        <>
          <div className="filters">
            <input
              type="text"
              className="search-input"
              placeholder="Search cores by name, author, system, description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="category-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All categories ({totalCores})</option>
              {categories.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>

          {error && <div className="error">Error: {error}</div>}

          <CoreGrid
            cores={cores}
            loading={loading}
            onSelect={setSelectedCoreId}
          />

          {selectedCoreId && (
            <CoreDetail
              coreId={selectedCoreId}
              onClose={() => setSelectedCoreId(null)}
            />
          )}
        </>
      )}

      {tab === 'recipes' && <RecipeBrowser />}
    </div>
  )
}
