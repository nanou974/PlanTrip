// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, loadConfig } from './index.js'

let server
let base
let overpass

beforeAll(async () => {
  vi.unstubAllGlobals()
  overpass = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      elements: [{ type: 'node', id: 7, lat: 47.2, lon: 3.5, tags: { tourism: 'caravan_site', name: 'Aire test', fee: 'yes', charge: '12 EUR', secret: 'x' } }],
    }),
  }))
  const config = loadConfig(
    { DATABASE_PATH: ':memory:', MAILBOX_DIR: mkdtempSync(join(tmpdir(), 'plantrip-osm-')), MAIL_MODE: 'file' },
    [],
  )
  config.fetchImpl = overpass
  config.logger = { warn: () => {}, info: () => {}, error: () => {} }
  server = createApp(config)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

const post = (body) =>
  fetch(`${base}/api/lodging-map`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

describe('POST /api/lodging-map', () => {
  it('renvoie les hébergements OpenStreetMap du trajet, sans réponse mise en cache par le navigateur', async () => {
    const res = await post({ polyline: [[3.4, 47.1], [3.6, 47.3]], radiusMeters: 5000 })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const json = await res.json()
    expect(json.source).toBe('OpenStreetMap')
    expect(json.elements[0]).toMatchObject({ id: 7, lat: 47.2, tags: { name: 'Aire test', charge: '12 EUR' } })
    expect(json.elements[0].tags.secret).toBeUndefined()
  })

  it('refuse un tracé invalide (400) et un trajet trop long (422)', async () => {
    expect((await post({ polyline: 'x' })).status).toBe(400)
    expect((await post({ polyline: [[-5, 36], [25, 60]] })).status).toBe(422)
  })

  it('n’accepte que POST', async () => {
    const res = await fetch(`${base}/api/lodging-map`)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})