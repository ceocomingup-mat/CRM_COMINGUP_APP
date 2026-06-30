import { defineConfig } from '@playwright/test'

// E2E (FIN) — przepływy TYLKO-DO-ODCZYTU na żywej bazie (logowanie, RLS, nawigacja,
// render stron, strażnik ról). Bez mutacji → bezpieczne do wielokrotnego puszczania.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5175',
    headless: true,
    actionTimeout: 10_000,
  },
  webServer: {
    command: 'npm run dev -- --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
    timeout: 90_000,
  },
})
