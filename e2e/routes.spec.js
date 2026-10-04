import { expect, test } from '@playwright/test'
import { expectPageHealthy, watchPage } from './helpers.js'

/** Routes publiques principales. `/preparer-son-voyage` est le chemin réel du planificateur. */
const PUBLIC_ROUTES = [
  '/',
  '/vehicules',
  '/fonctionnalites',
  '/preparer-son-voyage',
  '/resultat-voyage',
  '/login',
  '/register',
  '/blog',
  '/faq',
  '/contact',
  '/mentions-legales',
  '/confidentialite',
  '/accessibilite',
]

test.describe('routes publiques', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} s'affiche sans erreur ni écran blanc`, async ({ page }) => {
      const issues = watchPage(page)

      const response = await page.goto(route)
      expect(response?.status(), `statut HTTP pour ${route}`).toBeLessThan(400)

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 })
      await expectPageHealthy(page, issues)
    })
  }

  test('une route inconnue affiche le 404, pas un écran blanc', async ({ page }) => {
    const issues = watchPage(page)
    await page.goto('/route-qui-nexiste-pas')
    await expect(page.getByText(/Cette page n'existe pas/)).toBeVisible()
    await expectPageHealthy(page, issues)
  })
})
