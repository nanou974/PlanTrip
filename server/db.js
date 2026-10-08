import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  algo TEXT,
  salt TEXT,
  hash TEXT,
  params TEXT,
  created_at INTEGER NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS magic (
  email TEXT PRIMARY KEY,
  code_hash TEXT,
  token_hash TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trips (
  owner TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner, id)
);
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  show_departure INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON shares(owner, trip_id);
`

/** Ouvre la base SQLite (fichier ou mémoire) et crée le schéma. */
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(SCHEMA)
  migrateVerifiedColumn(db)
  return db
}

/**
 * Bases créées avant la colonne `verified` : un compte ouvert par lien magique
 * a prouvé la possession de son email (vérifié) ; un compte inscrit par mot de
 * passe ne l'a pas encore prouvée.
 */
function migrateVerifiedColumn(db) {
  const columns = db.prepare('PRAGMA table_info(users)').all()
  if (columns.some((c) => c.name === 'verified')) return
  db.exec('ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0')
  db.exec("UPDATE users SET verified = 1 WHERE provider = 'magic'")
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/** Forme publique d'un compte — jamais les colonnes de hachage. */
export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    provider: row.provider,
    hasPassword: Boolean(row.algo),
    createdAt: row.created_at,
  }
}

export class Store {
  constructor(db) {
    this.db = db
    this.stmts = {
      insertUser: db.prepare(
        'INSERT INTO users (id, email, name, provider, algo, salt, hash, params, created_at, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ),
      claimAccount: db.prepare(
        'UPDATE users SET algo = NULL, salt = NULL, hash = NULL, params = NULL, verified = 1 WHERE id = ?',
      ),
      findUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
      findUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
      setUserName: db.prepare('UPDATE users SET name = ? WHERE id = ?'),
      setUserPassword: db.prepare('UPDATE users SET algo = ?, salt = ?, hash = ?, params = ? WHERE id = ?'),
      insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
      purgeExpiredSessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
      findSession: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
      deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
      deleteSessionsOf: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
      upsertMagic: db.prepare(
        `INSERT INTO magic (email, code_hash, token_hash, attempts, expires_at, created_at)
         VALUES (?, ?, ?, 0, ?, ?)
         ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, token_hash = excluded.token_hash,
           attempts = 0, expires_at = excluded.expires_at, created_at = excluded.created_at`,
      ),
      findMagic: db.prepare('SELECT * FROM magic WHERE email = ?'),
      findMagicByToken: db.prepare('SELECT * FROM magic WHERE token_hash = ?'),
      bumpMagicAttempts: db.prepare('UPDATE magic SET attempts = ? WHERE email = ?'),
      deleteMagic: db.prepare('DELETE FROM magic WHERE email = ?'),
      insertSpace: db.prepare('INSERT INTO spaces (id, key_hash, created_at, last_seen) VALUES (?, ?, ?, ?)'),
      findSpace: db.prepare('SELECT * FROM spaces WHERE id = ?'),
      touchSpace: db.prepare('UPDATE spaces SET last_seen = ? WHERE id = ?'),
      deleteSpace: db.prepare('DELETE FROM spaces WHERE id = ?'),
      idleSpaces: db.prepare('SELECT id FROM spaces WHERE last_seen < ?'),
      listTrips: db.prepare('SELECT id, data, updated_at, deleted FROM trips WHERE owner = ? ORDER BY updated_at DESC'),
      findTrip: db.prepare('SELECT id, data, updated_at, deleted FROM trips WHERE owner = ? AND id = ?'),
      upsertTrip: db.prepare(
        `INSERT INTO trips (owner, id, data, updated_at, deleted) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(owner, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted`,
      ),
      countLiveTrips: db.prepare('SELECT COUNT(*) AS n FROM trips WHERE owner = ? AND deleted = 0'),
      deleteTripsOf: db.prepare('DELETE FROM trips WHERE owner = ?'),
      purgeTombstones: db.prepare('DELETE FROM trips WHERE deleted = 1 AND updated_at < ?'),
      insertShare: db.prepare('INSERT INTO shares (token, owner, trip_id, show_departure, created_at) VALUES (?, ?, ?, ?, ?)'),
      findShare: db.prepare('SELECT * FROM shares WHERE token = ?'),
      findShareOfTrip: db.prepare('SELECT * FROM shares WHERE owner = ? AND trip_id = ?'),
      listShares: db.prepare('SELECT token, trip_id, show_departure, created_at FROM shares WHERE owner = ?'),
      setShareDeparture: db.prepare('UPDATE shares SET show_departure = ? WHERE token = ?'),
      deleteShare: db.prepare('DELETE FROM shares WHERE token = ?'),
      deleteSharesOfTrip: db.prepare('DELETE FROM shares WHERE owner = ? AND trip_id = ?'),
      deleteSharesOf: db.prepare('DELETE FROM shares WHERE owner = ?'),
      moveShares: db.prepare('UPDATE shares SET owner = ? WHERE owner = ?'),
    }
  }

  /* ——— Espaces anonymes ——— */

  createSpace(id, keyHash, now = Date.now()) {
    this.stmts.insertSpace.run(id, keyHash, now, now)
  }

  findSpace(id) {
    return this.stmts.findSpace.get(id) || null
  }

  touchSpace(id, now = Date.now()) {
    this.stmts.touchSpace.run(now, id)
  }

  /** Supprime un espace, ses voyages et ses partages. */
  deleteSpaceCompletely(id) {
    this.wipeOwner(`s:${id}`)
    this.stmts.deleteSpace.run(id)
  }

  /** Supprime les espaces sans activité depuis `cutoff` et les suppressions trop anciennes. */
  purge({ idleCutoff, tombstoneCutoff }) {
    for (const row of this.stmts.idleSpaces.all(idleCutoff)) this.deleteSpaceCompletely(row.id)
    this.stmts.purgeTombstones.run(tombstoneCutoff)
  }

  /* ——— Voyages synchronisés ——— */

  listOwnerTrips(owner) {
    return this.stmts.listTrips.all(owner).map((row) => ({
      id: row.id,
      updatedAt: row.updated_at,
      deleted: Boolean(row.deleted),
      data: row.deleted || !row.data ? null : JSON.parse(row.data),
    }))
  }

  findOwnerTrip(owner, id) {
    const row = this.stmts.findTrip.get(owner, id)
    return row ? { id: row.id, updatedAt: row.updated_at, deleted: Boolean(row.deleted), data: row.data ? JSON.parse(row.data) : null } : null
  }

  countLiveTrips(owner) {
    return this.stmts.countLiveTrips.get(owner).n
  }

  /**
   * Applique un voyage reçu : la modification la plus récente l'emporte (égalité : le serveur garde la sienne).
   * Renvoie 'stored' ou 'stale'.
   */
  applyTrip(owner, item) {
    const existing = this.stmts.findTrip.get(owner, item.id)
    if (existing && existing.updated_at >= item.updatedAt) return 'stale'
    this.stmts.upsertTrip.run(owner, item.id, item.deleted ? null : JSON.stringify(item.data), item.updatedAt, item.deleted ? 1 : 0)
    if (item.deleted) this.stmts.deleteSharesOfTrip.run(owner, item.id)
    return 'stored'
  }

  /** Supprime tous les voyages et partages d'un propriétaire. */
  wipeOwner(owner) {
    this.stmts.deleteTripsOf.run(owner)
    this.stmts.deleteSharesOf.run(owner)
  }

  /** Fusionne les voyages d'un espace anonyme dans un compte (le plus récent gagne), puis vide l'espace. */
  adoptSpace(spaceId, userId) {
    const from = `s:${spaceId}`
    const to = `u:${userId}`
    this.db.exec('BEGIN')
    try {
      for (const t of this.stmts.listTrips.all(from)) {
        this.applyTrip(to, {
          id: t.id,
          updatedAt: t.updated_at,
          deleted: Boolean(t.deleted),
          data: t.data ? JSON.parse(t.data) : null,
        })
      }
      // Les partages suivent leurs voyages, sauf ceux dont le voyage n'existe plus côté compte.
      this.stmts.moveShares.run(to, from)
      this.stmts.deleteTripsOf.run(from)
      this.stmts.deleteSpace.run(spaceId)
      this.db.exec('COMMIT')
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }

  /* ——— Partages ——— */

  createShare(token, owner, tripId, showDeparture, now = Date.now()) {
    this.stmts.insertShare.run(token, owner, tripId, showDeparture ? 1 : 0, now)
  }

  findShare(token) {
    return this.stmts.findShare.get(token) || null
  }

  findShareOfTrip(owner, tripId) {
    return this.stmts.findShareOfTrip.get(owner, tripId) || null
  }

  listOwnerShares(owner) {
    return this.stmts.listShares.all(owner).map((r) => ({
      token: r.token,
      tripId: r.trip_id,
      showDeparture: Boolean(r.show_departure),
      createdAt: r.created_at,
    }))
  }

  setShareDeparture(token, showDeparture) {
    this.stmts.setShareDeparture.run(showDeparture ? 1 : 0, token)
  }

  deleteShare(token) {
    this.stmts.deleteShare.run(token)
  }

  /**
   * Crée un compte. `password` = fiche de hachage { algo, salt, hash, params }
   * ou null (compte ouvert par lien magique, sans mot de passe).
   */
  createUser({ id, email, name, provider, password = null, createdAt = Date.now() }) {
    this.stmts.insertUser.run(
      id,
      normalizeEmail(email),
      name,
      provider,
      password?.algo ?? null,
      password?.salt ?? null,
      password?.hash ?? null,
      password ? JSON.stringify(password.params ?? {}) : null,
      createdAt,
      provider === 'magic' ? 1 : 0,
    )
    return publicUser(this.findUserByEmail(email))
  }

  findUserByEmail(email) {
    return this.stmts.findUserByEmail.get(normalizeEmail(email)) || null
  }

  findUserById(id) {
    return this.stmts.findUserById.get(id) || null
  }

  passwordRecordOf(row) {
    if (!row?.algo) return null
    let params = {}
    try {
      params = JSON.parse(row.params || '{}')
    } catch {
      params = {}
    }
    return { algo: row.algo, salt: row.salt, hash: row.hash, params }
  }

  setUserPassword(id, password) {
    this.stmts.setUserPassword.run(password.algo, password.salt, password.hash, JSON.stringify(password.params ?? {}), id)
  }

  /**
   * Le lien magique vient de prouver que la personne contrôle la boîte mail.
   * Un compte inscrit par mot de passe sans cette preuve a pu être créé par un
   * tiers (pré-détournement) : on supprime son mot de passe et on coupe ses
   * sessions. Renvoie true si le compte a été repris de cette façon.
   */
  claimUnverifiedAccount(id) {
    const row = this.findUserById(id)
    if (!row || row.verified) return false
    const hadPassword = Boolean(row.algo)
    this.stmts.claimAccount.run(id)
    this.deleteSessionsOf(id)
    return hadPassword
  }

  setUserName(id, name) {
    this.stmts.setUserName.run(String(name || '').trim(), id)
  }

  createSession(tokenHash, userId, ttlMs) {
    const now = Date.now()
    // Purge opportuniste : la table ne grandit jamais au-delà des sessions vivantes.
    this.stmts.purgeExpiredSessions.run(now)
    this.stmts.insertSession.run(tokenHash, userId, now, now + ttlMs)
  }

  /** Renvoie l'utilisateur si la session existe et n'est pas expirée ; purger sinon. */
  resolveSession(tokenHash) {
    const row = this.stmts.findSession.get(tokenHash)
    if (!row) return null
    if (row.expires_at < Date.now()) {
      this.stmts.deleteSession.run(tokenHash)
      return null
    }
    return publicUser(this.findUserById(row.user_id))
  }

  deleteSession(tokenHash) {
    this.stmts.deleteSession.run(tokenHash)
  }

  deleteSessionsOf(userId) {
    this.stmts.deleteSessionsOf.run(userId)
  }

  issueMagic(email, { codeHash, tokenHash, ttlMs }) {
    const now = Date.now()
    this.stmts.upsertMagic.run(normalizeEmail(email), codeHash, tokenHash, now + ttlMs, now)
  }

  findMagic(email) {
    return this.stmts.findMagic.get(normalizeEmail(email)) || null
  }

  findMagicByToken(tokenHash) {
    return this.stmts.findMagicByToken.get(tokenHash) || null
  }

  bumpMagicAttempts(email, attempts) {
    this.stmts.bumpMagicAttempts.run(attempts, normalizeEmail(email))
  }

  deleteMagic(email) {
    this.stmts.deleteMagic.run(normalizeEmail(email))
  }
}
