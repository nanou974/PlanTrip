import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * Tests E2E contre le build de production servi par le serveur PlanTrip
 * (`server/index.js` : fichiers statiques + API d'authentification).
 * Le service worker (mode hors connexion) n'existe qu'en production : le
 * serveur de test sert donc le build, pas `vite dev`. `--fresh` repart d'une
 * base vierge à chaque session ; les comptes e2e sont horodatés.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && node server/index.js --fresh --port 4173',
    url: `${BASE_URL}/api/health`,
    // Base et boîte aux lettres dédiées : `--fresh` efface la base, jamais celle du site en production.
    env: { DATABASE_PATH: 'var/plantrip-e2e.db', MAILBOX_DIR: 'var/mailbox-e2e' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
