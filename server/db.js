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
    }
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
