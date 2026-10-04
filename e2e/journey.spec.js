import { expect, test } from '@playwright/test'
import {
  createTrip,
  expectPageHealthy,
  mockRemoteServices,
  openTripTab,
  watchPage,
} from './helpers.js'

test.describe('parcours principal', () => {
  test('accueil → préparation → véhicule → calcul → résultat → sections du voyage', async ({
    page,
  }) => {
    const issues = watchPage(page)
    await mockRemoteServices(page)

    // 1. Accueil
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/Le GPS qui/i)
    await expectPageHealthy(page, issues)

    // 2. Accès au planificateur depuis l'accueil
    await page.locator('main a[href="/preparer-son-voyage"]').first().click()
    await page.waitForURL('**/preparer-son-voyage')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/PlanTrip construit/i)
    await expectPageHealthy(page, issues)

    // 3. + 4. + 5. Départ, arrivée, véhicule, dates, budget → calcul
    await createTrip(page)
    await expect(page).toHaveURL(/\/resultat-voyage$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Votre voyage Paris → Lyon/)
    await expectPageHealthy(page, issues)

    // Le résultat affiche un chiffre exploitable (distance/durée/budget)
    const resultText = await page.locator('body').innerText()
    expect(resultText).toMatch(/\d/)
    expect(resultText).not.toMatch(/€\s*NaN/)

    // 6. Ouverture du voyage depuis la liste, puis toutes les sections
    await page.getByRole('link', { name: 'Mes voyages' }).first().click()
    await page.waitForURL('**/mes-voyages')
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/voyages|Mes voyages/i)
    await expect(page.getByText('Paris → Lyon').first()).toBeVisible()
    await expectPageHealthy(page, issues)

    await page.locator('main a[href^="/voyages/"]').first().click()
    await page.waitForURL(/\/voyages\/[^/]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Paris → Lyon')
    await expectPageHealthy(page, issues)

    const sections = [
      ['Vue d’ensemble', ''],
      ['Itinéraire', 'itineraire'],
      ['Calendrier', 'calendrier'],
      ['Budget', 'budget'],
      ['Lieux', 'lieux'],
      ['Documents', 'documents'],
      ['Organisation', 'organisation'],
    ]
    for (const [label, slug] of sections) {
      await openTripTab(page, label, slug)
      await expectPageHealthy(page, issues)
    }
  })
})
