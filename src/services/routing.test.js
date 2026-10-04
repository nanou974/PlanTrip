import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildGpx,
  estimateRoute,
  fetchRoute,
  haversineMeters,
  instructionFor,
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
