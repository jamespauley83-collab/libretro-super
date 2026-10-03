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

for (const control of ['search', 'category']) {
  for (const staleOutcome of ['success', 'failure']) {
    test(`${control} ignores stale ${staleOutcome} after the latest results`, async () => {
      const previousFetch = globalThis.fetch
      const pending = []
      globalThis.fetch = url => {
        if (url === '/api/stats') return previousFetch(url)
        return new Promise((resolve, reject) => { pending.push({ url, resolve, reject }) })
      }
      let renderer
      const latest = cores.find(core => core.id === 'anarch')
      try {
        await act(async () => { renderer = TestRenderer.create(React.createElement(App)) })
        await act(async () => {
          renderer.root.findByProps({ className: control === 'search' ? 'search-input' : 'category-select' })
            .props.onChange({ target: { value: control === 'search' ? 'Anarch' : 'Game' } })
        })
        assert.equal(pending.length, 2)
        assert.ok(pending[1].url.includes(control === 'search' ? 'search=Anarch' : 'category=Game'))
        await act(async () => {
          pending[1].resolve({ ok: true, json: async () => ({ cores: [latest], total: 329 }) })
        })
        await act(async () => {
          if (staleOutcome === 'success') {
            pending[0].resolve({ ok: true, json: async () => ({ cores, total: 999 }) })
          } else {
            pending[0].reject(new Error('Obsolete request failed'))
          }
        })
        assert.deepEqual(renderer.root.findByType(CoreGrid).props.cores, [latest])
        assert.equal(renderer.root.findByType(CoreGrid).props.loading, false)
        assert.equal(renderer.root.findAllByProps({ className: 'error' }).length, 0)
        assert.equal(renderer.root.findAllByType('option').find(option => option.props.value === '').children.join(''),
          'All categories (329)')
      } finally {
        await act(async () => { renderer?.unmount() })
        globalThis.fetch = previousFetch
      }
    })
  }
}

test('stale completion keeps the latest query loading and a new query clears old errors', async () => {
  const previousFetch = globalThis.fetch
  const pending = []
  globalThis.fetch = url => url === '/api/stats' ? previousFetch(url)
    : new Promise((resolve, reject) => { pending.push({ resolve, reject }) })
  let renderer
  try {
    await act(async () => { renderer = TestRenderer.create(React.createElement(App)) })
    const changeSearch = value => act(async () => {
      renderer.root.findByProps({ className: 'search-input' }).props.onChange({ target: { value } })
    })
    await changeSearch('Anarch')
    await act(async () => { pending[0].reject(new Error('Obsolete failure')) })
    assert.equal(renderer.root.findByType(CoreGrid).props.loading, true)
    assert.equal(renderer.root.findAllByProps({ className: 'error' }).length, 0)
    await act(async () => { pending[1].reject(new Error('Current failure')) })
    assert.equal(renderer.root.findByType(CoreGrid).props.loading, false)
    assert.match(renderer.root.findByProps({ className: 'error' }).children.join(''), /Current failure/)
    await changeSearch('FinalBurn Neo')
    assert.equal(renderer.root.findAllByProps({ className: 'error' }).length, 0)
    assert.equal(renderer.root.findByType(CoreGrid).props.loading, true)
    const fbneo = cores.find(core => core.id === 'fbneo')
    await act(async () => {
      pending[2].resolve({ ok: true, json: async () => ({ cores: [fbneo], total: 329 }) })
    })
    assert.deepEqual(renderer.root.findByType(CoreGrid).props.cores, [fbneo])
  } finally {
    await act(async () => { renderer?.unmount() })
    globalThis.fetch = previousFetch
  }
})
