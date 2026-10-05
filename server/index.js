import { existsSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createApiHandler } from './api.js'
import { openDatabase, Store } from './db.js'
import { serveStatic } from './static.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')

export function loadConfig(env = process.env, argv = []) {
  const arg = (name) => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const int = (v, fallback) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  return {
    fresh: argv.includes('--fresh'),
    port: int(arg('--port') ?? env.PORT, 4174),
    host: env.HOST || '127.0.0.1',
    databasePath: env.DATABASE_PATH || join(ROOT, 'var', 'plantrip.db'),
    mailMode: env.MAIL_MODE === 'smtp' ? 'smtp' : 'file',
    mailboxDir: env.MAILBOX_DIR || join(ROOT, 'var', 'mailbox'),
    smtpUrl: env.SMTP_URL || null,
    mailFrom: env.MAIL_FROM || 'no-reply@plantrip.local',
    magicTtlMs: int(env.MAGIC_TTL_MIN, 10) * 60_000,
    sessionTtlMs: int(env.SESSION_TTL_DAYS, 7) * 86_400_000,
    dist: env.DIST_DIR || DIST,
  }
}

/** Crée le serveur (API + fichiers statiques) sans l'écouter. */
export function createApp(config) {
  if (config.fresh && existsSync(config.databasePath)) rmSync(config.databasePath)
  const store = new Store(openDatabase(config.databasePath))
  const handleApi = createApiHandler({ store, config })
  return createServer(async (req, res) => {
    try {
      const handled = await handleApi(req, res)
      if (handled) return
      if (!existsSync(config.dist)) {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' })
        res.end('Build manquant : lancez `npm run build`.')
        return
      }
      serveStatic(req, res, config.dist)
    } catch (err) {
      console.error('[plantrip-server]', err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' })
        res.end('Erreur serveur')
      } else {
        res.end()
      }
    }
  })
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (invokedDirectly) {
  const config = loadConfig(process.env, process.argv.slice(2))
  if (!existsSync(config.dist)) console.warn('[plantrip-server] dist/ absent : lancez `npm run build`.')
  const server = createApp(config)
  server.listen(config.port, config.host, () => {
    console.log(
      `PlanTrip sur http://${config.host}:${config.port} — API /api/*, base ${config.databasePath}, mail ${config.mailMode}`,
    )
  })
}
