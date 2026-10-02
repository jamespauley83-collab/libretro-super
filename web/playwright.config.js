import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: 'node server/index.js',
      url: 'http://127.0.0.1:3001/api/health',
      env: { REPO_ROOT: fileURLToPath(new URL('../', import.meta.url)), PORT: '3001' },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --strictPort',
      url: 'http://127.0.0.1:3000/api/health',
    },
  ],
})
