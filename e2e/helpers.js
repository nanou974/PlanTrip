import { expect } from '@playwright/test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const vehicles = require('../src/data/vehicles.json')

export const VOITURE = vehicles.find((v) => v.slug === 'voiture')

/** PNG 1×1 transparent : sert de tuile cartographique factice. */
const TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const city = (properties, coordinates) => ({ properties, geometry: { coordinates } })

const PARIS = city(
  { name: 'Paris', city: 'Paris', state: 'Île-de-France', country: 'France', osm_type: 'relation', osm_id: 7444 },
  [2.3522, 48.8566],
)
const LYON = city(
  { name: 'Lyon', city: 'Lyon', state: 'Auvergne-Rhône-Alpes', country: 'France', osm_type: 'relation', osm_id: 45602 },
  [4.8357, 45.764],
)

const OSRM_ANSWER = {
  code: 'Ok',
  routes: [
    {
      distance: 465_000,
      duration: 16_800,
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [3.5, 47.2],
          [4.8357, 45.764],
        ],
      },
      legs: [
        {
          steps: [
            { name: 'Rue de Rivoli', distance: 1200, duration: 300, maneuver: { type: 'depart', modifier: 'right' } },
            { name: 'A6', distance: 400_000, duration: 15_000, maneuver: { type: 'continue', modifier: 'straight' } },
            { name: '', distance: 800, duration: 200, maneuver: { type: 'arrive' } },
          ],
        },
      ],
    },
  ],
}

/**
 * Les services tiers (Photon, OSRM, Overpass, tuiles OSM) sont remplacés par des
 * réponses factices : le test exerce la logique de PlanTrip sans dépendre de la
 * disponibilité ou du quota d'un service public. Ces services restent, eux,
 * « réseau seul » — voir README « Services externes ».
 */
export async function mockRemoteServices(page) {
  await page.route('https://photon.komoot.io/**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q')?.toLowerCase() ?? ''
    const features = query.startsWith('lyo')
      ? [LYON]
      : query.startsWith('par')
        ? [PARIS]
        : [PARIS, LYON]
    await route.fulfill({ json: { features } })
  })

  await page.route('https://router.project-osrm.org/**', (route) =>
    route.fulfill({ json: OSRM_ANSWER }),
  )

  await page.route('https://overpass-api.de/**', (route) =>
    route.fulfill({ json: { elements: [] } }),
  )

  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({ body: TILE_PNG, headers: { 'content-type': 'image/png' } }),
  )
}

/** Collecte des erreurs JS non interceptées et des erreurs console inattendues. */
export function watchPage(page) {
  const issues = { pageErrors: [], consoleErrors: [] }
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text())
  })
  return issues
}

/** Bruit attendu : ressources externes injoignables, favicon, CORS de tuiles. */
const EXPECTED_NOISE =
  /Failed to load resource|net::ERR_|the server responded with a status of|ERR_INTERNET_DISCONNECTED|ERR_ABORTED|ERR_FAILED|favicon/i

export function expectNoFatalErrors(issues) {
  expect(
    issues.pageErrors,
    `Erreurs JavaScript non interceptées :\n${issues.pageErrors.join('\n')}`,
  ).toEqual([])

  const reactErrors = issues.consoleErrors.filter((text) =>
    /Minified React error|Uncaught \[?Error|Each child in a list|Warning:/.test(text),
  )
  expect(reactErrors, `Erreurs React/console critiques :\n${reactErrors.join('\n')}`).toEqual([])

  const unexpected = issues.consoleErrors.filter((text) => !EXPECTED_NOISE.test(text))
  expect(unexpected, `Erreurs console inattendues :\n${unexpected.join('\n')}`).toEqual([])
}

/** Ni écran blanc, ni valeur invalide, ni erreur JS. */
export async function expectPageHealthy(page, issues) {
  const text = (await page.locator('body').innerText()).trim()
  expect(text.length, 'page vide / écran blanc').toBeGreaterThan(40)
  expect(text, 'texte "NaN" affiché').not.toMatch(/\bNaN\b/)
  expect(text, 'texte "undefined" affiché').not.toMatch(/\bundefined\b/)
  expectNoFatalErrors(issues)
}

/** Crée un voyage via l'interface et s'arrête sur `/resultat-voyage`. */
export async function createTrip(page, { start = '2026-06-01', end = '2026-06-05', budget = '900' } = {}) {
  await page.goto('/preparer-son-voyage')

  await page.getByLabel('Départ', { exact: true }).fill('Paris')
  await page.getByRole('button', { name: /^Paris,/ }).click()
  await page.getByLabel('Arrivée', { exact: true }).fill('Lyon')
  await page.getByRole('button', { name: /^Lyon,/ }).click()

  await page
    .locator('button')
    .filter({ hasText: VOITURE.icon })
    .filter({ hasText: VOITURE.name })
    .first()
    .click()

  const dates = page.locator('input[type="date"]')
  await dates.nth(0).fill(start)
  await dates.nth(1).fill(end)
  await page.getByPlaceholder('Budget maximal en euros').fill(budget)

  await page.getByRole('button', { name: /Construire mon voyage/ }).click()
  await page.waitForURL('**/resultat-voyage')
}

/** Ouvre un onglet de l'espace voyage et vérifie l'URL. */
export async function openTripTab(page, label, slug) {
  const nav = page.getByRole('navigation', { name: 'Sections du voyage' })
  await nav.getByRole('link', { name: label, exact: true }).click()
  await page.waitForURL(
    slug ? new RegExp(`/voyages/[^/]+/${slug}$`) : /\/voyages\/[^/]+$/,
  )
}
