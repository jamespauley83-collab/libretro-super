import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'
import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { createServer } from 'vite'
import { readCores } from '../server/parseCores.js'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const cores = readCores(repoRoot)
const originalFetch = globalThis.fetch
const requests = []
let vite
let App
let CoreCard
let CoreGrid

before(async () => {
  vite = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
  })
  ;({ default: App } = await vite.ssrLoadModule('/src/App.jsx'))
  ;({ default: CoreCard } = await vite.ssrLoadModule('/src/components/CoreCard.jsx'))
  ;({ default: CoreGrid } = await vite.ssrLoadModule('/src/components/CoreGrid.jsx'))
  globalThis.fetch = async url => {
    requests.push(url)
    let data
    if (url === '/api/stats') {
      data = { totalCores: cores.length, platformCount: 9, categories: {}, licenses: {} }
    } else if (url.startsWith('/api/cores?')) {
      data = { cores, total: cores.length }
    } else {
      const id = decodeURIComponent(url.slice('/api/cores/'.length))
      const core = cores.find(core => core.id === id)
      assert.ok(core, `Detail requested using an unknown ID: ${url}`)
      data = { ...core, buildRecipes: [] }
    }
    return { ok: true, json: async () => data }
  }
})

after(async () => {
  globalThis.fetch = originalFetch
  await vite?.close()
})

test('grid keys use unique IDs even for missing and duplicate corenames', () => {
  const grid = CoreGrid({ cores, loading: false, onSelect: () => {} })
  assert.deepEqual(grid.props.children.map(card => card.key), cores.map(core => core.id))
})

test('real app selects, fetches, renders and reopens missing-name and duplicate-name cores', async () => {
  let renderer
  await act(async () => { renderer = TestRenderer.create(React.createElement(App)) })
  try {
    const targets = [
      ...cores.filter(core => !core.corename),
      cores.find(core => core.id === 'mupen64plus_next'),
      cores.find(core => core.id === 'mupen64plus_next_develop'),
      cores.find(core => core.id === 'mupen64plus_next'),
      cores.find(core => core.id === 'anarch'),
      cores.find(core => core.id === 'fbneo'),
    ]
    for (const core of targets) {
      const card = renderer.root.findAllByType(CoreCard).find(card => card.props.core.id === core.id)
      await act(async () => { card.findByProps({ className: 'core-card' }).props.onClick() })
      assert.equal(requests.at(-1), `/api/cores/${encodeURIComponent(core.id)}`)
      assert.equal(renderer.root.findByType('h2').children.join(''), core.display_name || core.corename || core.id)
      if (core.description) {
        assert.equal(renderer.root.findByProps({ className: 'core-description' }).children.join(''), core.description)
      }
      await act(async () => { renderer.root.findByProps({ className: 'modal-close' }).props.onClick() })
      assert.equal(renderer.root.findAllByProps({ className: 'modal-overlay' }).length, 0)
    }
  } finally {
    await act(async () => { renderer.unmount() })
  }
})
