import { expect, test } from '@playwright/test'
import {
  createTrip,
  expectPageHealthy,
  mockRemoteServices,
  openTripTab,
  watchPage,
} from './helpers.js'

/** Identifiants générés à l'exécution : aucun secret dans le dépôt. */
function testAccount() {
  const stamp = Date.now()
  return {
    name: 'Voyageur E2E',
    email: `e2e-${stamp}@plantrip.test`,
    password: `E2e-${stamp}-Pass`,
  }
}

test.describe('espace applicatif', () => {
  test('création d’un compte local puis profil et export de sauvegarde', async ({ page }) => {
    const issues = watchPage(page)
    const account = testAccount()

    await page.goto('/register')
    await page.locator('#register-name').fill(account.name)
    await page.locator('#register-email').fill(account.email)
    await page.locator('#register-password').fill(account.password)
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await expectPageHealthy(page, issues)

    // Profil : compte local, aucun appel réseau
    await page.goto('/mon-profil')
    await expect(page.locator('#profile-name')).toHaveValue(account.name)
    await expect(page.locator('#profile-email')).toHaveValue(account.email)
    await expectPageHealthy(page, issues)

    // Export de la sauvegarde (fichier local, pas de serveur)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter ma sauvegarde' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^plantrip-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('tableau de bord, création d’un voyage et sections principales', async ({ page }) => {
    const issues = watchPage(page)
    await mockRemoteServices(page)

    // Tableau de bord (accessible sans compte : données locales)
    await page.goto('/tableau-de-bord')
    await expect(page.locator('h1').first()).toBeVisible()
    await expectPageHealthy(page, issues)

    // Création d'un voyage via le planificateur
    await createTrip(page)
    await expect(page).toHaveURL(/\/resultat-voyage$/)
    await expectPageHealthy(page, issues)

    // Le voyage est présent dans les listes locales
    await page.goto('/mes-voyages')
    await expect(page.getByText('Paris → Lyon').first()).toBeVisible()
    await expectPageHealthy(page, issues)

    await page.goto('/tableau-de-bord')
    await expect(page.getByText('Paris → Lyon').first()).toBeVisible()
    await expectPageHealthy(page, issues)

    // Sections principales du voyage
    await page.goto('/mes-voyages')
    await page.locator('main a[href^="/voyages/"]').first().click()
    await page.waitForURL(/\/voyages\/[^/]+$/)

    for (const [label, slug] of [
      ['Itinéraire', 'itineraire'],
      ['Calendrier', 'calendrier'],
      ['Budget', 'budget'],
      ['Lieux', 'lieux'],
      ['Documents', 'documents'],
      ['Organisation', 'organisation'],
    ]) {
      await openTripTab(page, label, slug)
      await expectPageHealthy(page, issues)
    }

    // Vue d'ensemble
    await openTripTab(page, 'Vue d’ensemble', '')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Paris → Lyon')
    await expectPageHealthy(page, issues)
  })

  test('page budget globale et profil hors session', async ({ page }) => {
    const issues = watchPage(page)

    await page.goto('/budget')
    await expect(page.locator('h1').first()).toBeVisible()
    await expectPageHealthy(page, issues)

    await page.goto('/mon-profil')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/profil/i)
    await expect(page.getByRole('link', { name: /Se connecter/ }).first()).toBeVisible()
    await expectPageHealthy(page, issues)
  })
})
