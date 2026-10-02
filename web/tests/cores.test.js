import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'
import { readCores } from '../server/parseCores.js'
import { readRecipes } from '../server/parseRecipes.js'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const cores = readCores(repoRoot)
const recipes = readRecipes(repoRoot)
let server
let baseUrl

before(async () => {
  server = spawn(process.execPath, ['server/index.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, REPO_ROOT: repoRoot, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise((resolve, reject) => {
    let output = ''
    let errors = ''
    const timeout = setTimeout(() => reject(new Error(`API startup timed out: ${errors}`)), 10000)
    server.stderr.on('data', chunk => { errors += chunk })
    server.once('error', error => { clearTimeout(timeout); reject(error) })
    server.once('exit', code => {
      clearTimeout(timeout)
      reject(new Error(`API exited with ${code}: ${errors}`))
    })
    server.stdout.on('data', chunk => {
      output += chunk
      const match = output.match(/API server running on port (\d+)/)
      if (match) {
        clearTimeout(timeout)
        baseUrl = `http://127.0.0.1:${match[1]}`
        resolve()
      }
    })
  })
})

after(async () => {
  if (server && server.exitCode === null && server.signalCode === null) {
    const exited = once(server, 'exit')
    server.kill()
    await exited
  }
})

async function getJson(route) {
  const response = await fetch(`${baseUrl}${route}`)
  assert.equal(response.status, 200, route)
  return response.json()
}

function expectedRecipes(id) {
  return Object.entries(recipes).flatMap(([platform, files]) =>
    files.flatMap(file => {
      const recipe = file.cores.find(row => row.corename === id)
      return recipe ? [{ platform, file: file.name, recipe }] : []
    })
  )
}

test('every metadata file has a nonempty, unique filename-derived ID', () => {
  assert.ok(cores.length > 0)
  assert.equal(new Set(cores.map(core => core.id)).size, cores.length)
  for (const core of cores) {
    assert.ok(core.id)
    assert.equal(core.id, core._file.replace(/(?:_libretro)?\.info$/, ''))
  }
  assert.equal(cores.find(core => core.id === 'fbneo').corename, 'FinalBurn Neo')
})

test('every listed ID retrieves its exact metadata record and matching recipes', async () => {
  const listed = await getJson('/api/cores')
  assert.deepEqual(listed, { total: cores.length, filtered: cores.length, cores })
  for (const core of listed.cores) {
    const detail = await getJson(`/api/cores/${encodeURIComponent(core.id)}`)
    assert.deepEqual(detail, { ...core, buildRecipes: expectedRecipes(core.id) }, core.id)
  }
})

test('FinalBurn Neo recipes use fbneo rather than the human-facing corename', async () => {
  const detail = await getJson('/api/cores/fbneo')
  assert.equal(detail.corename, 'FinalBurn Neo')
  assert.equal(detail._file, 'fbneo_libretro.info')
  assert.ok(detail.buildRecipes.length > 0)
  assert.ok(detail.buildRecipes.every(row => row.recipe.corename === 'fbneo'))
  assert.deepEqual(detail.buildRecipes, expectedRecipes('fbneo'))
})

test('metadata without corename is addressable, including Anarch and RVVM', async () => {
  const unnamed = cores.filter(core => !core.corename)
  assert.ok(unnamed.some(core => core.id === 'anarch'))
  assert.ok(unnamed.some(core => core.id === 'rvvm'))
  for (const core of unnamed) {
    const detail = await getJson(`/api/cores/${encodeURIComponent(core.id)}`)
    assert.equal(detail._file, core._file)
    assert.equal(detail.display_name, core.display_name)
  }
})

test('duplicate Mupen64Plus-Next names return distinct stable and development entries', async () => {
  const stable = await getJson('/api/cores/mupen64plus_next')
  const develop = await getJson('/api/cores/mupen64plus_next_develop')
  assert.equal(stable.corename, develop.corename)
  assert.notEqual(stable._file, develop._file)
  assert.notEqual(stable.display_name, develop.display_name)
  assert.equal(stable.is_experimental, 'false')
  assert.equal(develop.is_experimental, 'true')
  assert.deepEqual(stable.buildRecipes, expectedRecipes(stable.id))
  assert.deepEqual(develop.buildRecipes, expectedRecipes(develop.id))
})

test('unknown IDs and ambiguous display names return 404', async () => {
  for (const id of ['not-a-real-core', 'Mupen64Plus-Next']) {
    const response = await fetch(`${baseUrl}/api/cores/${encodeURIComponent(id)}`)
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { error: 'Core not found' })
  }
})

test('display-name search, category/system filtering, recipes, stats and health still work', async () => {
  const search = await getJson('/api/cores?search=FinalBurn%20Neo')
  assert.ok(search.cores.some(core => core.id === 'fbneo'))
  const category = await getJson('/api/cores?category=Game')
  assert.ok(category.filtered > 0)
  assert.ok(category.cores.every(core => core.categories === 'Game'))
  const system = await getJson('/api/cores?system=nintendo_64')
  assert.ok(system.cores.some(core => core.id === 'mupen64plus_next'))
  assert.deepEqual(await getJson('/api/recipes'), recipes)
  const stats = await getJson('/api/stats')
  assert.equal(stats.totalCores, cores.length)
  assert.equal(stats.platformCount, Object.keys(recipes).length)
  assert.deepEqual(await getJson('/api/health'), { status: 'ok', cores: cores.length })
})
