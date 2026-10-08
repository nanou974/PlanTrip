/**
 * Sauvegarde de la base SQLite de PlanTrip (comptes, voyages enregistrés).
 *
 * Usage : node scripts/backup-db.mjs [dossier-destination] [nombre-à-conserver]
 *   - base : DATABASE_PATH, sinon var/plantrip.db ;
 *   - destination par défaut : ./var/backups ;
 *   - on conserve les 30 sauvegardes les plus récentes.
 *
 * `VACUUM INTO` produit une copie cohérente même si le serveur tourne. Les sauvegardes
 * contiennent des adresses e-mail et des données de comptes : ne les publiez jamais.
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.env.DATABASE_PATH || join(ROOT, 'var', 'plantrip.db')
const destDir = resolve(process.argv[2] || join(ROOT, 'var', 'backups'))
const keep = Math.max(1, Number(process.argv[3]) || 30)

if (!existsSync(source)) {
  console.error(`Base introuvable : ${source}`)
  process.exit(1)
}
mkdirSync(destDir, { recursive: true })

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
const target = join(destDir, `plantrip-${stamp}.db`)
if (existsSync(target)) {
  console.error(`La sauvegarde existe déjà : ${target}`)
  process.exit(1)
}

const db = new DatabaseSync(source)
try {
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
} finally {
  db.close()
}

// Vérifie la copie avant de supprimer quoi que ce soit.
const copy = new DatabaseSync(target)
const check = copy.prepare('PRAGMA integrity_check').get()
copy.close()
if (String(Object.values(check)[0]) !== 'ok') {
  console.error('Copie corrompue : sauvegarde conservée pour examen, rien n’a été supprimé.')
  process.exit(1)
}

const old = readdirSync(destDir)
  .filter((f) => /^plantrip-\d{8}-\d{4}\.db$/.test(f))
  .map((f) => ({ f, t: statSync(join(destDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)
  .slice(keep)
for (const { f } of old) unlinkSync(join(destDir, f))

console.log(`Sauvegarde OK : ${target} (${statSync(target).size} octets). Conservées : ${Math.min(keep, readdirSync(destDir).length)}.`)
