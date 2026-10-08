// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, loadConfig } from './index.js'

let server
let base

async function api(path, { method = 'POST', body, cookie, space, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(space ? { 'X-PlanTrip-Space': `${space.id}.${space.key}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data, headers: res.headers }
}

async function newSpace() {
  const res = await api('/api/space')
  expect(res.status).toBe(201)
  return res.data.space
}

async function newUser(email) {
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Secret-123', name: 'Test' }),
  })
  const cookie = /pt_session=([^;]+)/.exec(res.headers.get('set-cookie') || '')[1]
  return `pt_session=${cookie}`
}

const tripData = (name, extra = {}) => ({
  name,
  departure: { name: '1 rue X, Paris', lat: 48.8566, lon: 2.3522, context: 'Paris, France' },
  destination: { name: 'Lyon', lat: 45.764, lon: 4.8357 },
  notes: 'privé',
  itinerary: { distanceKm: 465, durationSec: 17000, polyline: [[2.3522, 48.8566], [4.8357, 45.764]] },
  ...extra,
})

beforeAll(async () => {
  vi.unstubAllGlobals()
  const config = loadConfig(
    { DATABASE_PATH: ':memory:', MAILBOX_DIR: mkdtempSync(join(tmpdir(), 'plantrip-sync-')), MAIL_MODE: 'file' },
    [],
  )
  server = createApp(config)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

describe('espace anonyme et synchronisation', () => {
  it('crée un espace dont la clé n’est jamais stockée en clair', async () => {
    const space = await newSpace()
    expect(space.id).toMatch(/^[a-f0-9]{32}$/)
    expect(space.key).toMatch(/^[a-f0-9]{64}$/)
  })

  it('refuse toute synchronisation sans identité, ou avec une fausse clé', async () => {
    expect((await api('/api/sync', { body: { trips: [] } })).status).toBe(401)
    const space = await newSpace()
    const wrong = { id: space.id, key: 'a'.repeat(64) }
    expect((await api('/api/sync', { body: { trips: [] }, space: wrong })).status).toBe(401)
    expect((await api('/api/sync', { body: { trips: [] }, headers: { 'X-PlanTrip-Space': 'n-importe-quoi' } })).status).toBe(401)
  })

  it('enregistre, relit depuis un autre appareil et isole les espaces', async () => {
    const a = await newSpace()
    const b = await newSpace()
    const put = await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('Lyon') }] }, space: a })
    expect(put.status).toBe(200)
    expect(put.data.results.t_1).toBe('stored')
    expect(put.data.kind).toBe('space')
    // « autre appareil » : même clé, aucun voyage local
    const other = await api('/api/sync', { body: { trips: [] }, space: a })
    expect(other.data.trips).toHaveLength(1)
    expect(other.data.trips[0].data.name).toBe('Lyon')
    // un autre espace ne voit rien
    expect((await api('/api/sync', { body: { trips: [] }, space: b })).data.trips).toEqual([])
  })

  it('la modification la plus récente l’emporte, une plus ancienne est ignorée', async () => {
    const s = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 2000, data: tripData('Récent') }] }, space: s })
    const old = await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('Ancien') }] }, space: s })
    expect(old.data.results.t_1).toBe('stale')
    expect(old.data.trips[0].data.name).toBe('Récent')
    const newer = await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 3000, data: tripData('Plus récent') }] }, space: s })
    expect(newer.data.results.t_1).toBe('stored')
    expect(newer.data.trips[0].data.name).toBe('Plus récent')
  })

  it('une suppression se propage et ne ressuscite pas avec une version plus ancienne', async () => {
    const s = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('A') }] }, space: s })
    const del = await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 2000, deleted: true }] }, space: s })
    expect(del.data.trips[0]).toMatchObject({ id: 't_1', deleted: true, data: null })
    const back = await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1500, data: tripData('A') }] }, space: s })
    expect(back.data.results.t_1).toBe('stale')
    expect(back.data.trips[0].deleted).toBe(true)
  })

  it('refuse les corps invalides et applique la limite de voyages', async () => {
    const s = await newSpace()
    expect((await api('/api/sync', { body: { trips: [{ id: '../x', updatedAt: 1, data: {} }] }, space: s })).status).toBe(400)
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}`, updatedAt: 1000, data: tripData(`V${i}`) }))
    expect((await api('/api/sync', { body: { trips: many }, space: s })).status).toBe(200)
    const over = await api('/api/sync', { body: { trips: [{ id: 'extra', updatedAt: 1000, data: tripData('Extra') }] }, space: s })
    expect(over.status).toBe(413)
    expect(over.data.error.code).toBe('quota_exceeded')
  })

  it('« supprimer mes données » efface voyages, partages et espace', async () => {
    const s = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('A') }] }, space: s })
    const share = await api('/api/shares', { body: { tripId: 't_1' }, space: s })
    expect(share.status).toBe(201)
    expect((await api('/api/sync', { method: 'DELETE', space: s })).status).toBe(204)
    expect((await api('/api/sync', { body: { trips: [] }, space: s })).status).toBe(401)
    expect((await api(`/api/shared/${share.data.share.token}`, { method: 'GET' })).status).toBe(404)
  })
})

describe('synchronisation avec un compte', () => {
  it('relie le compte aux voyages quel que soit l’appareil', async () => {
    const cookie = await newUser('sync1@exemple.fr')
    const put = await api('/api/sync', { body: { trips: [{ id: 't_9', updatedAt: 5000, data: tripData('Compte') }] }, cookie })
    expect(put.data.kind).toBe('user')
    const other = await api('/api/sync', { body: { trips: [] }, cookie })
    expect(other.data.trips[0].data.name).toBe('Compte')
  })

  it('reprend l’espace anonyme dans le compte à la connexion, le plus récent gagnant', async () => {
    const cookie = await newUser('sync2@exemple.fr')
    await api('/api/sync', { body: { trips: [{ id: 't_a', updatedAt: 9000, data: tripData('Compte récent') }] }, cookie })
    const space = await newSpace()
    await api('/api/sync', {
      body: {
        trips: [
          { id: 't_a', updatedAt: 1000, data: tripData('Local ancien') },
          { id: 't_b', updatedAt: 2000, data: tripData('Local seul') },
        ],
      },
      space,
    })
    const adopt = await api('/api/sync/adopt', { cookie, space })
    expect(adopt.status).toBe(200)
    const names = Object.fromEntries(adopt.data.trips.map((t) => [t.id, t.data.name]))
    expect(names).toEqual({ t_a: 'Compte récent', t_b: 'Local seul' })
    // L'espace n'existe plus.
    expect((await api('/api/sync', { body: { trips: [] }, space })).status).toBe(401)
  })

  it('l’adoption exige une session et un espace valides', async () => {
    const space = await newSpace()
    expect((await api('/api/sync/adopt', { space })).status).toBe(401)
    const cookie = await newUser('sync3@exemple.fr')
    expect((await api('/api/sync/adopt', { cookie })).status).toBe(404)
  })
})

describe('partage en lecture seule', () => {
  async function shared(token) {
    return api(`/api/shared/${token}`, { method: 'GET' })
  }

  it('publie une version assainie, sans identité, non cachée et non indexable', async () => {
    const s = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('Paris → Lyon') }] }, space: s })
    const share = await api('/api/shares', { body: { tripId: 't_1' }, space: s })
    expect(share.status).toBe(201)
    const token = share.data.share.token
    expect(token).toMatch(/^[a-f0-9]{32}$/)
    const pub = await shared(token)
    expect(pub.status).toBe(200)
    expect(pub.headers.get('x-robots-tag')).toContain('noindex')
    expect(pub.headers.get('cache-control')).toBe('no-store')
    expect(pub.data.trip.name).toBe('Paris → Lyon')
    expect(pub.data.trip.departureHidden).toBe(true)
    const text = JSON.stringify(pub.data)
    expect(text).not.toContain('1 rue X')
    expect(text).not.toContain('privé')
    expect(text).not.toContain(s.id)
    expect(text).not.toContain(s.key)
  })

  it('le départ exact n’apparaît que sur demande, et le choix se modifie', async () => {
    const s = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('V') }] }, space: s })
    const first = await api('/api/shares', { body: { tripId: 't_1', showDeparture: true }, space: s })
    const token = first.data.share.token
    expect((await shared(token)).data.trip.departure.name).toContain('1 rue X')
    const again = await api('/api/shares', { body: { tripId: 't_1', showDeparture: false }, space: s })
    expect(again.status).toBe(200)
    expect(again.data.share.token).toBe(token)
    expect((await shared(token)).data.trip.departure.name).toBe('Paris, France')
  })

  it('suit les mises à jour du voyage et disparaît avec lui', async () => {
    const s = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('Avant') }] }, space: s })
    const token = (await api('/api/shares', { body: { tripId: 't_1' }, space: s })).data.share.token
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 2000, data: tripData('Après') }] }, space: s })
    expect((await shared(token)).data.trip.name).toBe('Après')
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 3000, deleted: true }] }, space: s })
    expect((await shared(token)).status).toBe(404)
  })

  it('un partage se liste et se révoque, uniquement par son propriétaire', async () => {
    const owner = await newSpace()
    const stranger = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('V') }] }, space: owner })
    const token = (await api('/api/shares', { body: { tripId: 't_1' }, space: owner })).data.share.token
    const list = await api('/api/shares', { method: 'GET', space: owner })
    expect(list.data.shares).toEqual([expect.objectContaining({ token, tripId: 't_1', showDeparture: false })])
    expect((await api(`/api/shares/${token}`, { method: 'DELETE', space: stranger })).status).toBe(404)
    expect((await shared(token)).status).toBe(200)
    expect((await api(`/api/shares/${token}`, { method: 'DELETE', space: owner })).status).toBe(204)
    expect((await shared(token)).status).toBe(404)
  })

  it('refuse de partager un voyage inconnu et un jeton mal formé', async () => {
    const s = await newSpace()
    expect((await api('/api/shares', { body: { tripId: 'inconnu' }, space: s })).status).toBe(404)
    expect((await shared('xyz')).status).toBe(404)
    expect((await shared('0'.repeat(32))).status).toBe(404)
    expect((await api('/api/shares', { body: { tripId: 't_1' } })).status).toBe(401)
  })

  it('les partages suivent l’espace dans le compte', async () => {
    const space = await newSpace()
    await api('/api/sync', { body: { trips: [{ id: 't_1', updatedAt: 1000, data: tripData('Suivi') }] }, space })
    const token = (await api('/api/shares', { body: { tripId: 't_1' }, space })).data.share.token
    const cookie = await newUser('share1@exemple.fr')
    await api('/api/sync/adopt', { cookie, space })
    expect((await shared(token)).data.trip.name).toBe('Suivi')
    expect((await api('/api/shares', { method: 'GET', cookie })).data.shares).toHaveLength(1)
  })
})
