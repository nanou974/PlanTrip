import { expect, test } from '@playwright/test'
import { createTrip, expectNoFatalErrors, mockRemoteServices, watchPage } from './helpers.js'

/**
 * Vérifie la promesse « hors connexion » réellement délivrée par PlanTrip :
 *  - shell applicatif servi par le service worker (pas d'écran blanc) ;
 *  - données locales (voyage) toujours lisibles ;
 *  - service réseau (recherche d'adresses Photon) : état explicite, pas d'erreur technique.
 *
 * Les services tiers (OSRM, Photon, Overpass, tuiles) ne sont PAS censés fonctionner
 * hors connexion : ils restent « réseau seul ».
 */
test.describe('mode hors connexion', () => {
  test('reload hors ligne : application utilisable, données locales, état explicite', async ({
    page,
    context,
  }) => {
    const issues = watchPage(page)
    await mockRemoteServices(page)

    // 1. Chargement initial en ligne : installation et activation du service worker
    await page.goto('/')
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return Boolean(registration?.active)
    })
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

    // 2. Un voyage existe en local
    await createTrip(page)
    await expect(page).toHaveURL(/\/resultat-voyage$/)
    await page.goto('/mes-voyages')
    await expect(page.getByText('Paris → Lyon').first()).toBeVisible()

    // 3. Perte réseau : plus aucune interception de requête, tout tombe
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await context.setOffline(true)

    // 4. Rechargement complet d'une route SPA importante
    await page.reload()
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 })

    // Données locales toujours accessibles
    await expect(page.getByText('Paris → Lyon').first()).toBeVisible()
    expect(await page.evaluate(() => navigator.onLine)).toBe(false)
    await expect(page.getByRole('status').filter({ hasText: 'Hors connexion.' })).toBeVisible()

    const text = await page.locator('body').innerText()
    expect(text).not.toMatch(/\bNaN\b/)
    expectNoFatalErrors(issues)

    // 5. Une fonctionnalité réseau affiche un état explicite (Photon hors connexion)
    await page.goto('/preparer-son-voyage')
    await page.getByLabel('Départ', { exact: true }).fill('Bordeaux')
    await expect(page.getByText(/Recherche impossible/)).toBeVisible()
    await expect(
      page.getByText(/une connexion est nécessaire/),
    ).toBeVisible()
    expectNoFatalErrors(issues)
  })
})
