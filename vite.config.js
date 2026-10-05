import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { generateServiceWorker, precacheVersion } from './src/pwa/service-worker-source.js'

/**
 * Écrit `dist/sw.js` après la construction, avec la liste exacte des fichiers
 * émis (index.html, JS/CSS hachés, manifeste). Les fichiers de `public/` autres
 * que le manifeste ne sont pas précachés : ils sont mis en cache à la première
 * demande (images) ou restent en réseau seul (services externes).
 */
function plantripServiceWorker() {
  return {
    name: 'plantrip-service-worker',
    apply: 'build',
    writeBundle(options, bundle) {
      const emitted = Object.keys(bundle).filter((name) => !name.endsWith('.map'))
      const precache = [
        './index.html',
        ...emitted
          .filter((name) => name !== 'index.html')
          .sort()
          .map((name) => `./${name}`),
        './manifest.webmanifest',
      ]
      const version = precacheVersion(emitted)
      const source = generateServiceWorker({ precache, version })
      writeFileSync(join(options.dir, 'sw.js'), source, 'utf8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), plantripServiceWorker()],
  // Base absolue : indispensable au repli hors connexion (l'index.html servi
  // pour une route profonde doit résoudre /assets/* quel que soit le chemin).
  base: '/',
  server: {
    // API : `npm run server` derrière le dev server Vite (port API_PORT ou 4174).
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.API_PORT || 4174}`,
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Unitaires uniquement : les specs Playwright (e2e/) ont leur propre runner.
    include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js'],
    css: false,
    restoreMocks: true,
    // jsdom + React : la première exécution est coûteuse, surtout en parallèle.
    testTimeout: 15000,
    hookTimeout: 10000,
  },
})
