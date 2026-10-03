import { test, expect } from '@playwright/test'

async function openCore(page, core) {
  const name = core.display_name || core.corename || core.id
  const card = page.locator('.core-card').filter({ has: page.locator('.core-name').getByText(name, { exact: true }) })
  const responsePromise = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/cores/${encodeURIComponent(core.id)}`
  )
  await card.click()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  const detail = await response.json()
  expect(detail._file).toBe(core._file)
  await expect(page.locator('.modal h2')).toHaveText(name)
  return detail
}

test('cards with missing corename open and can be closed and reopened', async ({ page, request }) => {
  const { cores } = await (await request.get('/api/cores')).json()
  const unnamed = cores.filter(core => !core.corename)
  expect(unnamed.some(core => core.id === 'anarch')).toBeTruthy()
  expect(unnamed.some(core => core.id === 'rvvm')).toBeTruthy()
  await page.goto('/')
  for (const core of unnamed) {
    await openCore(page, core)
    await page.locator('.modal-close').click()
    await expect(page.locator('.modal-overlay')).toHaveCount(0)
  }
  await openCore(page, unnamed.find(core => core.id === 'anarch'))
  await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } })
  await expect(page.locator('.modal-overlay')).toHaveCount(0)
})

test('duplicate core names select their own details repeatedly without duplicate-key warnings', async ({ page, request }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const { cores } = await (await request.get('/api/cores')).json()
  const stable = cores.find(core => core.id === 'mupen64plus_next')
  const develop = cores.find(core => core.id === 'mupen64plus_next_develop')
  const { cores: matches } = await (await request.get('/api/cores?search=Mupen64Plus-Next')).json()
  expect(matches.map(core => core.id)).toEqual(expect.arrayContaining([stable.id, develop.id]))
  await page.goto('/')
  await page.locator('.search-input').fill('Mupen64Plus-Next')
  await expect(page.locator('.core-card')).toHaveCount(matches.length)
  for (const core of [stable, develop, stable, develop]) {
    const detail = await openCore(page, core)
    expect(detail.is_experimental).toBe(core.is_experimental)
    await expect(page.locator('.core-description')).toHaveText(core.description)
    await page.locator('.modal-close').click()
    await expect(page.locator('.modal-overlay')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('FinalBurn Neo shows associated recipes while filtering and recipe navigation still work', async ({ page, request }) => {
  const { cores } = await (await request.get('/api/cores')).json()
  const fbneo = cores.find(core => core.id === 'fbneo')
  await page.goto('/')
  await page.locator('.search-input').fill('FinalBurn Neo')
  const detail = await openCore(page, fbneo)
  expect(detail.buildRecipes.length).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: `Build Recipes (${detail.buildRecipes.length})` })).toBeVisible()
  await expect(page.locator('.recipe-item')).toHaveCount(detail.buildRecipes.length)
  await page.locator('.modal-close').click()
  await page.locator('.search-input').fill('')
  await page.locator('.category-select').selectOption('Game')
  await expect(page.locator('.core-card')).toHaveCount(cores.filter(core => core.categories === 'Game').length)
  await page.getByRole('button', { name: 'Recipes', exact: true }).click()
  await expect(page.locator('.platform-tab')).toHaveCount(9)
  await expect(page.locator('.recipe-table').first()).toBeVisible()
  await page.getByRole('button', { name: 'Cores', exact: true }).click()
  await expect(page.locator('.category-select')).toHaveValue('Game')
  await expect(page.locator('.modal-overlay')).toHaveCount(0)
})
