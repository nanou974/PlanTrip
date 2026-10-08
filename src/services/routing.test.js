import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEGRADED_NOTICE,
  applyMinAverageSpeed,
  buildGpx,
  estimateRoute,
  fetchRoute,
  haversineMeters,
  instructionFor,
  needsSpecialRouting,
  profileForVehicle,
  routePoints,
} from './routing.js'

const paris = { name: 'Paris', lat: 48.8566, lon: 2.3522 }
const lyon = { name: 'Lyon', lat: 45.764, lon: 4.8357 }
const dijon = { name: 'Dijon', lat: 47.322, lon: 5.0415 }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('routePoints', () => {
  it('ordonne départ, étapes, destination', () => {
    expect(routePoints({ departure: paris, destination: lyon, waypoints: [dijon] })).toEqual([paris, dijon, lyon])
  })

  it('rejoue l’ordre en aller-retour', () => {
    const points = routePoints({ departure: paris, destination: lyon, waypoints: [dijon], returnTrip: true })
    expect(points).toEqual([paris, dijon, lyon, dijon, paris])
  })

  it('ignore les points invalides', () => {
    expect(routePoints({ departure: paris, destination: { name: 'x', lat: null, lon: null } })).toEqual([paris])
  })
})

describe('profil de véhicule', () => {
  it('choisit le bon moteur', () => {
    expect(profileForVehicle('velo')).toBe('cycling')
    expect(profileForVehicle('voiture', 'bike')).toBe('cycling')
    expect(profileForVehicle('moto')).toBe('driving')
  })
})

describe('estimation de repli', () => {
  it('mesure à vol d’oiseau et déduit une durée', () => {
    const route = estimateRoute(paris, lyon, 100)
    expect(route.estimated).toBe(true)
    expect(route.distance).toBeGreaterThan(haversineMeters(paris, lyon))
    expect(route.duration).toBeGreaterThan(3600)
    expect(route.coordinates).toEqual([
      [paris.lon, paris.lat],
      [lyon.lon, lyon.lat],
    ])
  })
})

describe('fetchRoute', () => {
  it('transforme la réponse OSRM', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 465000,
              duration: 16200,
              geometry: { coordinates: [[2.35, 48.85], [4.83, 45.76]] },
              legs: [{ steps: [{ name: 'A6', distance: 1000, duration: 60, maneuver: { type: 'turn', modifier: 'left' } }] }],
            },
          ],
        }),
      })),
    )
    const route = await fetchRoute([paris, lyon])
    expect(route.distance).toBe(465000)
    expect(route.duration).toBe(16200)
    expect(route.estimated).toBe(false)
    expect(route.coordinates).toHaveLength(2)
    expect(route.steps[0].instruction).toBe('Tournez à gauche sur A6')
  })

  it('signale un service en erreur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    )
    await expect(fetchRoute([paris, lyon])).rejects.toThrow(/OSRM a répondu 503/)
  })

  it('refuse un trajet incomplet', async () => {
    await expect(fetchRoute([paris])).rejects.toThrow(/Moins de deux points/)
  })
})

describe('instructions', () => {
  const step = (maneuver, name = '') => ({ maneuver, name, distance: 100, duration: 30 })

  it('traduit les manœuvres courantes', () => {
    expect(instructionFor(step({ type: 'depart' }))).toBe('Départ')
    expect(instructionFor(step({ type: 'arrive' }))).toBe('Arrivée')
    expect(instructionFor(step({ type: 'turn', modifier: 'right' }, 'Rue X'))).toBe('Tournez à droite sur Rue X')
    expect(instructionFor(step({ type: 'roundabout', exit: 2 }))).toBe('Rond-point, prenez la 2ᵉ sortie')
    expect(instructionFor(step({ type: 'new name' }, 'A6'))).toBe('Continuez sur A6')
  })
})

describe('export GPX', () => {
  it('génère un fichier valide et échappe les caractères spéciaux', () => {
    const gpx = buildGpx({
      name: 'Voyage A & B',
      points: [paris, lyon],
      route: { coordinates: [[2.35, 48.85], [4.83, 45.76]] },
    })
    expect(gpx).toContain('<?xml version="1.0"')
    expect(gpx).toContain('Voyage A &amp; B')
    expect(gpx).toContain('<wpt lat="48.8566" lon="2.3522">')
    expect(gpx.match(/<trkpt /g)).toHaveLength(2)
  })

  it('tombe sur les points fournis sans tracé', () => {
    const gpx = buildGpx({ name: 'x', points: [paris, lyon] })
    expect(gpx.match(/<trkpt /g)).toHaveLength(2)
  })
})

describe('fetchRoute — serveur PlanTrip puis repli OSRM', () => {
  const serverAnswer = {
    distance: 470000,
    duration: 18000,
    coordinates: [[2.35, 48.85], [4.83, 45.76]],
    steps: [{ name: 'A6', distance: 1, duration: 1, instruction: 'Continuez sur A6' }],
  }
  const osrmAnswer = {
    routes: [{ distance: 465000, duration: 16200, geometry: { coordinates: [[2.35, 48.85], [4.83, 45.76]] }, legs: [] }],
  }

  /** Simule /api/route (statut donné) puis OSRM. */
  function stubFetch(serverStatus, serverBody = serverAnswer) {
    const mock = vi.fn(async (url) => {
      if (String(url) === '/api/route') {
        return { ok: serverStatus === 200, status: serverStatus, json: async () => serverBody }
      }
      return { ok: true, status: 200, json: async () => osrmAnswer }
    })
    vi.stubGlobal('fetch', mock)
    return mock
  }

  it('utilise le serveur et lui transmet véhicule et options', async () => {
    const mock = stubFetch(200)
    const route = await fetchRoute([paris, lyon], { vehicle: 'camping-car', avoidTolls: true })
    expect(route.provider).toBe('openrouteservice')
    expect(route.degraded).toBe(false)
    expect(route.distance).toBe(470000)
    expect(mock).toHaveBeenCalledTimes(1)
    const sent = JSON.parse(mock.mock.calls[0][1].body)
    expect(sent).toMatchObject({ vehicle: 'camping-car', avoidTolls: true, avoidHighways: false })
    expect(sent.points).toHaveLength(2)
  })

  it('bascule sur OSRM si le serveur n’est pas configuré (503) et signale un calcul dégradé', async () => {
    stubFetch(503, {})
    const route = await fetchRoute([paris, lyon], { vehicle: 'camping-car' })
    expect(route.provider).toBe('osrm')
    expect(route.degraded).toBe(true)
    expect(route.distance).toBe(465000)
  })

  it('repli OSRM sans avertissement pour une voiture standard sans option', async () => {
    stubFetch(503, {})
    const route = await fetchRoute([paris, lyon], { vehicle: 'voiture' })
    expect(route.provider).toBe('osrm')
    expect(route.degraded).toBe(false)
  })

  it('bascule aussi sur OSRM si le serveur est injoignable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url) === '/api/route') throw new TypeError('network')
        return { ok: true, status: 200, json: async () => osrmAnswer }
      }),
    )
    expect((await fetchRoute([paris, lyon])).provider).toBe('osrm')
  })

  it('ne bascule pas sur OSRM quand aucun itinéraire n’existe pour ce véhicule (422)', async () => {
    const mock = stubFetch(422, {})
    mock.mockImplementation(async () => ({ ok: false, status: 422, json: async () => ({}) }))
    await expect(fetchRoute([paris, lyon], { vehicle: 'camping-car' })).rejects.toThrow(/Aucun itinéraire/)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('propage l’annulation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) }))
    await expect(fetchRoute([paris, lyon])).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('needsSpecialRouting', () => {
  it('voiture et moto standard : non', () => {
    expect(needsSpecialRouting({ vehicle: 'voiture' })).toBe(false)
    expect(needsSpecialRouting({ vehicle: 'moto' })).toBe(false)
    expect(needsSpecialRouting({})).toBe(false)
  })
  it('options d’évitement ou autre véhicule : oui', () => {
    expect(needsSpecialRouting({ vehicle: 'voiture', avoidTolls: true })).toBe(true)
    expect(needsSpecialRouting({ vehicle: 'velo' })).toBe(true)
    expect(needsSpecialRouting({ vehicle: 'voiture-sans-permis' })).toBe(true)
  })
  it('le message de secours est défini', () => {
    expect(DEGRADED_NOTICE).toMatch(/secours/)
  })
})

describe('applyMinAverageSpeed', () => {
  it('rallonge la durée d’une voiture sans permis (42 km/h max)', () => {
    // 465 km en 17 000 s (durée voiture) → au moins 465 000 / (42 / 3,6) s.
    expect(applyMinAverageSpeed(465000, 17000, 'voiture-sans-permis')).toBe(Math.round(465000 / (42 / 3.6)))
  })
  it('ne raccourcit jamais une durée et ignore les autres véhicules', () => {
    expect(applyMinAverageSpeed(1000, 99999, 'voiture-sans-permis')).toBe(99999)
    expect(applyMinAverageSpeed(465000, 17000, 'voiture')).toBe(17000)
  })
})
