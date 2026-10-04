import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SW_URL, registerServiceWorker } from './register.js'

// Vitest exécute la racine du projet comme dossier courant.
const ROOT = process.cwd()

function read(relativePath) {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

function pngSize(buffer) {
  const isPng = buffer.readUInt32BE(0) === 0x89504e47 && buffer.subarray(12, 16).toString('latin1') === 'IHDR'
  if (!isPng) return null
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

const manifest = JSON.parse(read('public/manifest.webmanifest'))

describe('Web App Manifest', () => {
  it('est un manifeste PlanTrip installable', () => {
    expect(manifest.name).toBe('PlanTrip — Préparez votre voyage sur mesure')
    expect(manifest.short_name).toBe('PlanTrip')
    expect(manifest.lang).toBe('fr')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#2E7D5B')
    expect(manifest.background_color).toBe('#F5F2ED')
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512', '512x512'])
    expect(manifest.icons[2].purpose).toBe('maskable')
    expect(manifest.shortcuts.length).toBeGreaterThan(0)
  })

  it('pointe vers des PNG réels aux dimensions déclarées', () => {
    for (const icon of manifest.icons) {
      const filePath = join(ROOT, 'public', icon.src.replace(/^\//, ''))
      expect(existsSync(filePath), `icône manquante : ${icon.src}`).toBe(true)
      const buffer = readFileSync(filePath)
      expect(pngSize(buffer)).toEqual({
        width: Number(icon.sizes.split('x')[0]),
        height: Number(icon.sizes.split('x')[1]),
      })
      expect(icon.type).toBe('image/png')
    }
  })
})

describe('wiring HTML / application', () => {
  const html = read('index.html')
  const main = read('src/main.jsx')

  it('index.html déclare le manifeste et l’icône Apple', () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png"')
  })

  it('le service worker n’est enregistré qu’en production', () => {
    expect(main).toContain('registerServiceWorker')
    expect(main).toContain('import.meta.env.PROD')
  })
})

describe('registerServiceWorker', () => {
  afterEach(() => {
    delete navigator.serviceWorker
  })

  it('enregistre sw.js à la racine', async () => {
    const register = vi.fn().mockResolvedValue({ scope: '/' })
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true })

    await expect(registerServiceWorker()).resolves.toEqual({ scope: '/' })
    expect(register).toHaveBeenCalledWith('sw.js')
    expect(SW_URL).toBe('sw.js')
  })

  it('accepte une URL explicite', async () => {
    const register = vi.fn().mockResolvedValue({})
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true })

    await registerServiceWorker({ swUrl: '/sub/sw.js' })
    expect(register).toHaveBeenCalledWith('/sub/sw.js')
  })

  it('renvoie null quand le navigateur ne supporte pas les service workers', async () => {
    expect('serviceWorker' in navigator).toBe(false)
    await expect(registerServiceWorker()).resolves.toBeNull()
  })

  it('renvoie null quand l’enregistrement échoue (hors connexion, http, refus)', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockRejectedValue(new Error('refusé')) },
      configurable: true,
    })
    await expect(registerServiceWorker()).resolves.toBeNull()
  })
})
