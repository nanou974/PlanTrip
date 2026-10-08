// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, loadConfig } from './index.js'
import { buildOrsRequest, parseOrsResponse, routingFor } from './route.js'

const paris = { lat: 48.8566, lon: 2.3522 }
const lyon = { lat: 45.764, lon: 4.8357 }

describe('buildOrsRequest', () => {
  it('voiture : profil driving-car sans option', () => {
    const r = buildOrsRequest({ vehicle: 'voiture', points: [paris, lyon] })
    expect(r.profile).toBe('driving-car')
    expect(r.request.coordinates).toEqual([[2.3522, 48.8566], [4.8357, 45.764]])
    expect(r.request.options).toBeUndefined()
    expect(r.request.language).toBe('fr')
  })

  it('évite péages et autoroutes à la demande', () => {
    const r = buildOrsRequest({ vehicle: 'voiture', points: [paris, lyon], avoidTolls: true, avoidHighways: true })
    expect(r.request.options.avoid_features.sort()).toEqual(['highways', 'tollways'])
  })

  it('voiture sans permis : autoroutes toujours évitées', () => {
    const r = buildOrsRequest({ vehicle: 'voiture-sans-permis', points: [paris, lyon] })
    expect(r.request.options.avoid_features).toEqual(['highways'])
  })

  it('camping-car : profil poids lourd avec hauteur et poids', () => {
    const r = buildOrsRequest({ vehicle: 'camping-car', points: [paris, lyon] })
    expect(r.profile).toBe('driving-hgv')
    expect(r.request.options.profile_params.restrictions).toEqual({ height: 3.2, weight: 3.5 })
  })

  it('vélo : profil cycliste, aucun évitement routier envoyé', () => {
    const r = buildOrsRequest({ vehicle: 'velo', points: [paris, lyon], avoidTolls: true, avoidHighways: true })
    expect(r.profile).toBe('cycling-regular')
    expect(r.request.options).toBeUndefined()
  })

  it('véhicule inconnu : traité comme une voiture (aucun profil libre)', () => {
    expect(routingFor('driving-hgv').profile).toBe('driving-car')
    expect(buildOrsRequest({ vehicle: '../x', points: [paris, lyon] }).profile).toBe('driving-car')
  })

  it('refuse les points invalides ou trop nombreux', () => {
    expect(buildOrsRequest({ points: [paris] }).error).toBeTruthy()
    expect(buildOrsRequest({ points: [paris, { lat: 99, lon: 0 }] }).error).toBeTruthy()
    expect(buildOrsRequest({ points: [paris, { lat: '48', lon: '2' }] }).error).toBeTruthy()
    expect(buildOrsRequest({ points: Array(51).fill(paris) }).error).toBeTruthy()
  })
})

describe('parseOrsResponse', () => {
  it('extrait distance, durée, tracé et étapes', () => {
    const parsed = parseOrsResponse(orsAnswer())
    expect(parsed.distance).toBe(465000)
    expect(parsed.duration).toBe(17000)
    expect(parsed.coordinates).toHaveLength(2)
    expect(parsed.steps).toEqual([{ name: 'A6', distance: 465000, duration: 17000, instruction: 'Continuez sur A6' }])
  })

  it('renvoie null sur une réponse vide', () => {
    expect(parseOrsResponse({})).toBeNull()
    expect(parseOrsResponse({ features: [] })).toBeNull()
  })
})

function orsAnswer() {
  return {
    features: [
      {
        geometry: { coordinates: [[2.35, 48.85], [4.83, 45.76]] },
        properties: {
          summary: { distance: 465000, duration: 17000 },
          segments: [{ steps: [{ instruction: 'Continuez sur A6', name: 'A6', distance: 465000, duration: 17000 }, { instruction: '' }] }],
        },
      },
    ],
  }
}

describe('POST /api/route', () => {
  let ors
  let orsBase
  let orsCalls
  let orsBehavior
  let app
  let base

  async function listen(srv) {
    await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve))
    return `http://127.0.0.1:${srv.address().port}`
  }

  beforeAll(async () => {
    // Le setup commun neutralise fetch : ces tests parlent à de vrais serveurs locaux.
    vi.unstubAllGlobals()
    orsCalls = []
    orsBehavior = () => ({ status: 200, body: orsAnswer() })
    ors = createServer((req, res) => {
      let data = ''
      req.on('data', (c) => (data += c))
      req.on('end', () => {
        orsCalls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(data || '{}') })
        const { status, body } = orsBehavior()
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(body))
      })
    })
    orsBase = await listen(ors)
    const dir = mkdtempSync(join(tmpdir(), 'pt-route-'))
    const config = loadConfig({
      DATABASE_PATH: join(dir, 'db.sqlite'),
      MAILBOX_DIR: join(dir, 'mail'),
      DIST_DIR: join(dir, 'dist'),
      ORS_API_KEY: 'secret-key',
      ORS_BASE_URL: orsBase,
    })
    app = createApp(config)
    base = await listen(app)
  })

  afterAll(async () => {
    await new Promise((r) => app.close(r))
    await new Promise((r) => ors.close(r))
  })

  const post = (body) =>
    fetch(`${base}/api/route`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('relaie à ORS avec la clé serveur et renvoie un tracé', async () => {
    const res = await post({ vehicle: 'camping-car', points: [paris, lyon] })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.provider).toBe('openrouteservice')
    expect(json.distance).toBe(465000)
    const call = orsCalls.at(-1)
    expect(call.url).toBe('/v2/directions/driving-hgv/geojson')
    expect(call.auth).toBe('secret-key')
    expect(call.body.options.profile_params.restrictions.height).toBe(3.2)
    expect(JSON.stringify(json)).not.toContain('secret-key')
  })

  it('voiture sans permis : la durée ne descend pas sous la vitesse réelle du véhicule', async () => {
    const res = await post({ vehicle: 'voiture-sans-permis', points: [{ lat: 44.1, lon: 2.1 }, { lat: 44.9, lon: 6.1 }] })
    const json = await res.json()
    // 465 km à 42 km/h ≈ 39 857 s, très au-dessus des 17 000 s d'ORS (durée de voiture).
    expect(json.duration).toBe(Math.round(465000 / (42 / 3.6)))
    const car = await (await post({ vehicle: 'voiture', points: [{ lat: 44.2, lon: 2.2 }, { lat: 44.8, lon: 6.2 }] })).json()
    expect(car.duration).toBe(17000)
  })

  it('camping-car : la durée longue distance n’est pas celle d’un camion (~64 km/h)', async () => {
    orsBehavior = () => {
      const body = orsAnswer()
      body.features[0].properties.summary.duration = 30000 // 465 km à 56 km/h
      return { status: 200, body }
    }
    const json = await (await post({ vehicle: 'camping-car', points: [{ lat: 48.8, lon: 2.3 }, { lat: 45.7, lon: 4.8 }] })).json()
    expect(json.duration).toBe(Math.round(465000 / (80 / 3.6)))
    const van = await (await post({ vehicle: 'van', points: [{ lat: 48.81, lon: 2.31 }, { lat: 45.71, lon: 4.81 }] })).json()
    expect(van.duration).toBe(Math.round(465000 / (85 / 3.6)))
  })

  it('camping-car : un trajet court garde la durée d’ORS et jamais plus rapide que celle-ci', async () => {
    orsBehavior = () => {
      const body = orsAnswer()
      body.features[0].properties.summary = { distance: 40000, duration: 4000 }
      return { status: 200, body }
    }
    const short = await (await post({ vehicle: 'camping-car', points: [{ lat: 48.9, lon: 2.4 }, { lat: 48.6, lon: 2.1 }] })).json()
    expect(short.duration).toBe(4000)
    orsBehavior = () => ({ status: 200, body: orsAnswer() })
    const fast = await (await post({ vehicle: 'camping-car', points: [{ lat: 48.82, lon: 2.32 }, { lat: 45.72, lon: 4.82 }] })).json()
    expect(fast.duration).toBe(17000)
  })
  it('met en cache une requête identique', async () => {
    const pts = [{ lat: 43.6, lon: 1.44 }, { lat: 43.3, lon: 5.37 }]
    await post({ vehicle: 'voiture', points: pts })
    const before = orsCalls.length
    const res = await post({ vehicle: 'voiture', points: pts })
    expect(res.status).toBe(200)
    expect(orsCalls.length).toBe(before)
  })

  it('traduit un refus ORS 404 en 422 « aucun itinéraire »', async () => {
    orsBehavior = () => ({ status: 404, body: { error: { code: 2010 } } })
    const res = await post({ vehicle: 'voiture', points: [{ lat: 10, lon: 10 }, { lat: 11, lon: 11 }] })
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('no_route')
    orsBehavior = () => ({ status: 200, body: orsAnswer() })
  })

  it('signale un quota atteint (429) et une panne amont (502)', async () => {
    orsBehavior = () => ({ status: 429, body: {} })
    expect((await post({ points: [{ lat: 20, lon: 20 }, { lat: 21, lon: 21 }] })).status).toBe(429)
    orsBehavior = () => ({ status: 403, body: {} })
    const forbidden = await post({ points: [{ lat: 25, lon: 25 }, { lat: 26, lon: 26 }] })
    expect(forbidden.status).toBe(503)
    expect((await forbidden.json()).error.code).toBe('upstream_forbidden')
    orsBehavior = () => ({ status: 500, body: {} })
    expect((await post({ points: [{ lat: 30, lon: 30 }, { lat: 31, lon: 31 }] })).status).toBe(502)
    orsBehavior = () => ({ status: 200, body: orsAnswer() })
  })

  it('applique le gabarit saisi (hauteur, poids) et ignore les valeurs absurdes', async () => {
    const pts = [{ lat: 45.1, lon: 2.1 }, { lat: 45.9, lon: 3.1 }]
    await post({ vehicle: 'camping-car', heightM: 2.9, weightT: 3, points: pts })
    const sent = orsCalls[orsCalls.length - 1]
    expect(JSON.stringify(sent)).toContain('"height":2.9')
    expect(JSON.stringify(sent)).toContain('"weight":3')
    await post({ vehicle: 'camping-car', heightM: 99, weightT: -1, points: [{ lat: 46.1, lon: 2.1 }, { lat: 46.9, lon: 3.1 }] })
    const def = JSON.stringify(orsCalls[orsCalls.length - 1])
    expect(def).toContain('"height":3.2')
    expect(def).toContain('"weight":3.5')
  })

  it('retente une fois quand ORS répond 5xx puis réussit', async () => {
    let n = 0
    orsBehavior = () => (n++ === 0 ? { status: 503, body: {} } : { status: 200, body: orsAnswer() })
    const res = await post({ vehicle: 'voiture', points: [{ lat: 40.1, lon: 3.1 }, { lat: 41.1, lon: 4.1 }] })
    expect(res.status).toBe(200)
    expect(n).toBe(2)
    orsBehavior = () => ({ status: 200, body: orsAnswer() })
  })

  it('rejette un corps invalide sans appeler ORS', async () => {
    const before = orsCalls.length
    const res = await post({ points: [paris] })
    expect(res.status).toBe(400)
    expect(orsCalls.length).toBe(before)
  })
})

describe('POST /api/route sans clé', () => {
  it('répond 503 pour que le navigateur bascule sur le repli', async () => {
    vi.unstubAllGlobals()
    const dir = mkdtempSync(join(tmpdir(), 'pt-route-nokey-'))
    const app = createApp(loadConfig({ DATABASE_PATH: join(dir, 'db.sqlite'), MAILBOX_DIR: join(dir, 'mail'), DIST_DIR: join(dir, 'dist') }))
    await new Promise((r) => app.listen(0, '127.0.0.1', r))
    try {
      const res = await fetch(`http://127.0.0.1:${app.address().port}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: [paris, lyon] }),
      })
      expect(res.status).toBe(503)
      expect((await res.json()).error.code).toBe('routing_unavailable')
    } finally {
      await new Promise((r) => app.close(r))
    }
  })
})
