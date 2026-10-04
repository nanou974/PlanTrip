import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTrip, mockRemoteServices, openTripTab } from './helpers.js'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const REPORT_DIR = join(process.cwd(), 'test-results', 'a11y')

/** Audit automatisé : toute violation WCAG 2.x A/AA fait échouer le test. */
async function expectNoViolations(page, label) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  }))

  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(join(REPORT_DIR, `${slug(label)}.json`), JSON.stringify(violations, null, 2))

  expect(violations, `${label} — ${violations.map((v) => `${v.id}(${v.nodes.length})`).join(', ')}`).toEqual(
    [],
  )
}

function slug(label) {
  return label.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}

const PUBLIC_PAGES = [
  ['véhicules', '/vehicules'],
  ['fiche véhicule', '/vehicules/voiture'],
  ['fonctionnalités', '/fonctionnalites'],
  ['questions fréquentes', '/faq'],
  ['contact', '/contact'],
  ['blog', '/blog'],
  ['mentions légales', '/mentions-legales'],
  ['confidentialité', '/confidentialite'],
  ['accessibilité', '/accessibilite'],
  ['page inconnue (404)', '/itineraire-inexistant'],
]

const APP_PAGES = [
  ['mes voyages', '/mes-voyages'],
  ['mon profil', '/mon-profil'],
  ['budget global', '/budget'],
]

const TRIP_SECTIONS = [
  ['Vue d’ensemble', ''],
  ['Itinéraire', 'itineraire'],
  ['Calendrier', 'calendrier'],
  ['Budget', 'budget'],
  ['Lieux', 'lieux'],
  ['Documents', 'documents'],
  ['Organisation', 'organisation'],
]

test.describe('audit accessibilité (axe-core)', () => {
  test('accueil', async ({ page }) => {
    await page.goto('/')
    await expectNoViolations(page, 'accueil')
  })

  test('préparation d’un voyage', async ({ page }) => {
    await mockRemoteServices(page)
    await page.goto('/preparer-son-voyage')
    await expectNoViolations(page, 'préparation d’un voyage')
  })

  test('résultat du voyage', async ({ page }) => {
    await mockRemoteServices(page)
    await createTrip(page)
    await expect(page).toHaveURL(/\/resultat-voyage$/)
    await expectNoViolations(page, 'résultat du voyage')
  })

  test('page applicative : tableau de bord', async ({ page }) => {
    await page.goto('/tableau-de-bord')
    await expect(page.locator('h1').first()).toBeVisible()
    await expectNoViolations(page, 'tableau de bord')
  })

  test('connexion', async ({ page }) => {
    await page.goto('/login')
    await expectNoViolations(page, 'connexion')
  })

  test('création de compte', async ({ page }) => {
    await page.goto('/register')
    await expectNoViolations(page, 'création de compte')
  })

  for (const [label, path] of PUBLIC_PAGES) {
    test(`page publique : ${label}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
      await expectNoViolations(page, label)
    })
  }

  for (const [label, path] of APP_PAGES) {
    test(`page applicative : ${label}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
      await expectNoViolations(page, label)
    })
  }

  test('espace voyage : toutes les sections', async ({ page }) => {
    await mockRemoteServices(page)
    await createTrip(page)

    await page.getByRole('link', { name: 'Mes voyages' }).first().click()
    await page.waitForURL('**/mes-voyages')
    await page.locator('main a[href^="/voyages/"]').first().click()
    await page.waitForURL(/\/voyages\/[^/]+$/)

    for (const [label, slugName] of TRIP_SECTIONS) {
      await openTripTab(page, label, slugName)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await expectNoViolations(page, `espace voyage — ${label}`)
    }
  })
})
