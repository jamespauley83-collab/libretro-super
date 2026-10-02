import express from 'express'
import cors from 'cors'
import { readCores } from './parseCores.js'
import { readRecipes } from './parseRecipes.js'

const app = express()
app.use(cors())

const REPO_ROOT = process.env.REPO_ROOT || '/repo'

// In-memory cache
let coresCache = null
let recipesCache = null

function getCores() {
  if (!coresCache) coresCache = readCores(REPO_ROOT)
  return coresCache
}

function getRecipes() {
  if (!recipesCache) recipesCache = readRecipes(REPO_ROOT)
  return recipesCache
}

app.get('/api/cores', (req, res) => {
  const cores = getCores()
  const { search, category, system } = req.query
  let filtered = cores

  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(c =>
      c.corename?.toLowerCase().includes(q) ||
      c.display_name?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.authors?.toLowerCase().includes(q) ||
      c.systemname?.toLowerCase().includes(q)
    )
  }
  if (category) {
    filtered = filtered.filter(c => c.categories === category)
  }
  if (system) {
    const s = system.toLowerCase()
    filtered = filtered.filter(c =>
      c.systemname?.toLowerCase().includes(s) ||
      c.systemid?.toLowerCase().includes(s)
    )
  }

  res.json({
    total: cores.length,
    filtered: filtered.length,
    cores: filtered,
  })
})

app.get('/api/cores/:id', (req, res) => {
  const cores = getCores()
  const core = cores.find(c => c.id === req.params.id)
  if (!core) return res.status(404).json({ error: 'Core not found' })

  // Find build recipes for this core
  const recipes = getRecipes()
  const buildRecipes = []
  for (const [platform, files] of Object.entries(recipes)) {
    for (const file of files) {
      const match = file.cores.find(c => c.corename === core.id)
      if (match) {
        buildRecipes.push({ platform, file: file.name, recipe: match })
      }
    }
  }

  res.json({ ...core, buildRecipes })
})

app.get('/api/recipes', (req, res) => {
  res.json(getRecipes())
})

app.get('/api/stats', (req, res) => {
  const cores = getCores()
  const recipes = getRecipes()

  const categories = {}
  const systems = {}
  const licenses = {}

  for (const c of cores) {
    const cat = c.categories || 'Unknown'
    categories[cat] = (categories[cat] || 0) + 1
    const sys = c.systemname || 'Unknown'
    systems[sys] = (systems[sys] || 0) + 1
    const lic = c.license || 'Unknown'
    licenses[lic] = (licenses[lic] || 0) + 1
  }

  const platformCount = Object.keys(recipes).length

  res.json({
    totalCores: cores.length,
    categories,
    systems,
    licenses,
    platformCount,
    totalRecipes: Object.values(recipes).reduce((sum, files) =>
      sum + files.reduce((s, f) => s + f.cores.length, 0), 0),
  })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cores: getCores().length })
})

const PORT = Number(process.env.PORT || 3001)
const server = app.listen(PORT, () => {
  console.log(`API server running on port ${server.address().port}`)
})
