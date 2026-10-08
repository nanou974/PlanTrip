import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { expectPageHealthy, watchPage } from './helpers.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MAILBOX = join(ROOT, 'var', 'mailbox-e2e')

/**
 * Le serveur écrit les emails envoyés en fichiers `.eml` (MAIL_MODE=file,
 * défaut) : le test lit le vrai message au lieu d'exposer un code en clair.
 * Le nom de fichier commence par l'email transformé comme dans `mailer.js`.
 */
async function lastMailFor(email) {
  const safeEmail = email.replace(/[^a-z0-9]+/gi, '_')
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    if (existsSync(MAILBOX)) {
      const files = readdirSync(MAILBOX)
        .filter((f) => f.endsWith('.eml') && f.includes(safeEmail))
        .sort()
        .reverse()
      if (files.length) return readFileSync(join(MAILBOX, files[0]), 'utf8')
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Aucun email reçu pour ${email} dans ${MAILBOX}`)
}

function stampEmail(prefix) {
  return `${prefix}-${Date.now()}@plantrip.test`
}

test.describe('authentification serveur', () => {
  test('connexion Magic Link par code reçu par email', async ({ page }) => {
    const issues = watchPage(page)
    const email = stampEmail('magic-code')

    await page.goto('/login')
    await page.getByRole('tab', { name: 'Magic Link' }).click()
    await page.locator('#login-magic-email').fill(email)
    await page.getByRole('button', { name: 'Envoyer le code' }).click()

    // Le code n'apparaît plus dans l'interface : il part par email.
    await expect(page.getByText('Code envoyé ! Vérifiez votre boîte mail')).toBeVisible()

    const mail = await lastMailFor(email)
    const code = mail.match(/code de connexion PlanTrip : (\d{6})/)?.[1]
    expect(code, 'code à 6 chiffres dans le message').toMatch(/^\d{6}$/)

    await page.locator('#login-otp').fill(code)
    await page.getByRole('button', { name: 'Vérifier et se connecter' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await expect(page.getByRole('button', { name: 'Déconnexion', exact: true })).toHaveCount(1)
    await expectPageHealthy(page, issues)
  })

  test('connexion Magic Link par le lien de l’email', async ({ page }) => {
    const issues = watchPage(page)
    const email = stampEmail('magic-lien')

    await page.goto('/login')
    await page.getByRole('tab', { name: 'Magic Link' }).click()
    await page.locator('#login-magic-email').fill(email)
    await page.getByRole('button', { name: 'Envoyer le code' }).click()
    await expect(page.getByText('Code envoyé ! Vérifiez votre boîte mail')).toBeVisible()

    const mail = await lastMailFor(email)
    const token = mail.match(/magique=([a-f0-9]{64})/)?.[1]
    expect(token, 'jeton de connexion dans le message').toMatch(/^[a-f0-9]{64}$/)

    await page.goto(`/login?magique=${token}`)
    await page.waitForURL((url) => url.pathname === '/' && !url.searchParams.has('magique'))
    await expect(page.getByRole('button', { name: 'Déconnexion', exact: true })).toHaveCount(1)
    await expectPageHealthy(page, issues)
  })

  test('un lien magique déjà consommé est refusé explicitement', async ({ page }) => {
    const issues = watchPage(page)
    const email = stampEmail('magic-double')

    await page.goto('/login')
    await page.getByRole('tab', { name: 'Magic Link' }).click()
    await page.locator('#login-magic-email').fill(email)
    await page.getByRole('button', { name: 'Envoyer le code' }).click()
    await expect(page.getByText('Code envoyé ! Vérifiez votre boîte mail')).toBeVisible()

    const mail = await lastMailFor(email)
    const token = mail.match(/magique=([a-f0-9]{64})/)[1]

    await page.goto(`/login?magique=${token}`)
    await page.waitForURL((url) => url.pathname === '/' && !url.searchParams.has('magique'))
    await page.getByRole('button', { name: 'Déconnexion', exact: true }).click()
    await page.waitForURL((url) => url.pathname === '/')

    await page.goto(`/login?magique=${token}`)
    await expect(page.getByRole('alert')).toContainText('invalide ou déjà utilisé')
    await expectPageHealthy(page, issues)
  })
})
