import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

/** En-têtes communs à toutes les réponses statiques. */
const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

/**
 * Sert `dist/` avec repli SPA (index.html) pour les routes du client.
 * Renvoie false uniquement si le chemin est déjà géré par l'API.
 */
export function serveStatic(req, res, root) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    res.writeHead(400, { ...BASE_HEADERS })
    res.end('Bad request')
    return true
  }

  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(root, safePath)
  if (!filePath.startsWith(root + sep) && filePath !== root) {
    res.writeHead(403, { ...BASE_HEADERS })
    res.end('Forbidden')
    return true
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html')

  if (!existsSync(filePath)) {
    // Repli SPA : toute route sans extension reçoit l'application.
    if (!extname(safePath)) filePath = join(root, 'index.html')
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...BASE_HEADERS })
      res.end('Not found')
      return true
    }
  }

  const ext = extname(filePath)
  // Pages de partage et de reprise : jamais indexées par les moteurs de recherche.
  const noindex = /^\/(partage|reprendre)(\/|$)/.test(pathname) ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}
  const isIndex = filePath.endsWith('index.html') || filePath.endsWith('sw.js')
  const immutable = filePath.includes(`${sep}assets${sep}`)
  res.writeHead(200, {
    ...BASE_HEADERS,
    ...noindex,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isIndex ? 'no-cache' : immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  createReadStream(filePath).pipe(res)
  return true
}
