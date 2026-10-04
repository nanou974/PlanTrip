import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { CACHE_PREFIX, NEVER_CACHE_PATHS, generateServiceWorker, precacheVersion } from './service-worker-source.js'

const ORIGIN = 'https://plantrip.test'
const SW_URL = `${ORIGIN}/sw.js`
const CACHE_NAME = `${CACHE_PREFIX}v1`

function href(request) {
  if (typeof request === 'string') return new URL(request, SW_URL).href
  return request.url
}

class FakeCache {
  constructor(entries = {}) {
    this.entries = { ...entries }
  }

  async addAll(paths) {
    for (const path of paths) {
      this.entries[href(path)] = `precache:${href(path)}`
    }
  }

  async match(request) {
    return this.entries[href(request)]
  }

  async put(request, response) {
    this.entries[href(request)] = response
  }
}

class FakeCacheStorage {
  constructor() {
    this.stores = new Map()
  }

  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache())
    return this.stores.get(name)
  }

  async keys() {
    return [...this.stores.keys()]
  }

  async delete(name) {
    return this.stores.delete(name)
  }

  async match(request) {
    for (const cache of this.stores.values()) {
      const hit = await cache.match(request)
      if (hit) return hit
    }
    return undefined
  }

  seed(name, entries) {
    this.stores.set(name, new FakeCache(entries))
  }
}

class FakeResponse {
  static error() {
    return { ok: false, error: true }
  }
}

function response(body, { ok = true, type = 'basic' } = {}) {
  return { ok, type, body, clone: () => response(body, { ok, type }) }
}

function network(handler) {
  const calls = []
  const fetchImpl = async (request) => {
    calls.push(typeof request === 'string' ? request : request.url)
    const result = handler(request)
    if (result instanceof Error) throw result
    return result
  }
  return { fetchImpl, calls }
}

function boot(source, fetchImpl) {
  const listeners = {}
  const claims = { count: 0 }
  const cacheStorage = new FakeCacheStorage()
  vm.runInNewContext(
    source,
    {
      self: {
        location: { href: SW_URL, origin: ORIGIN },
        clients: {
          claim: async () => {
            claims.count += 1
          },
        },
        addEventListener: (type, listener) => {
          listeners[type] = listener
        },
      },
      caches: cacheStorage,
      fetch: fetchImpl,
      URL,
      Response: FakeResponse,
    },
    { filename: 'sw.js' },
  )
  return { listeners, claims, cacheStorage }
}

async function install(listeners) {
  let done
  listeners.install({ waitUntil: (promise) => { done = promise } })
  await done
}

function dispatchFetch(listeners, request) {
  let intercepted = false
  let promise = null
  listeners.fetch({
    request,
    respondWith(value) {
      intercepted = true
      promise = Promise.resolve(value)
    },
    waitUntil() {},
  })
  return { intercepted, result: promise }
}

const PRECACHE = ['./index.html', './assets/index-abc123.js', './manifest.webmanifest']
const SOURCE = generateServiceWorker({ precache: PRECACHE, version: 'v1' })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('precacheVersion', () => {
  it('est déterministe et indépendant de l’ordre', () => {
    const a = precacheVersion(['b.js', 'index.html'])
    expect(precacheVersion(['index.html', 'b.js'])).toBe(a)
    expect(a).toMatch(/^[0-9a-z]+$/)
  })

  it('change quand les fichiers changent', () => {
    expect(precacheVersion(['index.html', 'b.js'])).not.toBe(precacheVersion(['index.html', 'c.js']))
  })
})

describe('generateServiceWorker', () => {
  it('précache les fichiers de l’application et un nom de cache versionné', () => {
    expect(SOURCE).toContain(`"${CACHE_NAME}"`)
    expect(SOURCE).toContain('"./index.html"')
    expect(SOURCE).toContain('"./assets/index-abc123.js"')
    expect(SOURCE).toContain('"./manifest.webmanifest"')
  })

  it('ne nomme aucun service externe (jamais mis en cache)', () => {
    expect(SOURCE).not.toMatch(/overpass|photon|osrm|openstreetmap|googleapis/i)
    expect(SOURCE).toContain('url.origin !== self.location.origin')
    expect(NEVER_CACHE_PATHS).toContain('/sw.js')
  })

  it('préfère le réseau pour les navigations et replie sur le shell', () => {
    expect(SOURCE).toContain("request.mode === 'navigate'")
    expect(SOURCE).toContain('SHELL_URL')
    expect(SOURCE).toContain('Response.error()')
  })
})

describe('cycle de vie (exécution réelle du script)', () => {
  it('installe le précache', async () => {
    const { listeners, cacheStorage } = boot(SOURCE, async () => response('x'))
    await install(listeners)
    expect(await cacheStorage.keys()).toEqual([CACHE_NAME])
    const cache = await cacheStorage.open(CACHE_NAME)
    expect(Object.keys(cache.entries)).toEqual(
      expect.arrayContaining([
        `${ORIGIN}/index.html`,
        `${ORIGIN}/assets/index-abc123.js`,
        `${ORIGIN}/manifest.webmanifest`,
      ]),
    )
  })

  it('purge les anciens caches plantrip-* et réclame les clients', async () => {
    const { listeners, claims, cacheStorage } = boot(SOURCE, async () => response('x'))
    cacheStorage.seed(`${CACHE_PREFIX}ancien`, { [`${ORIGIN}/old.js`]: 'old' })
    cacheStorage.seed('autre-application', { [`${ORIGIN}/autre.js`]: 'x' })

    let done
    listeners.activate({ waitUntil: (promise) => { done = promise } })
    await done

    expect(await cacheStorage.keys()).toEqual(['autre-application'])
    expect(claims.count).toBe(1)
  })

  it('sert index.html pour une route profonde quand le réseau tombe', async () => {
    const { fetchImpl, calls } = network(() => new Error('offline'))
    const { listeners } = boot(SOURCE, fetchImpl)
    await install(listeners)

    const { intercepted, result } = dispatchFetch(listeners, {
      url: `${ORIGIN}/mes-voyages`,
      method: 'GET',
      mode: 'navigate',
    })
    expect(intercepted).toBe(true)
    expect(await result).toBe(`precache:${ORIGIN}/index.html`)
    expect(calls).toHaveLength(1)
  })

  it('préfère le réseau quand il répond', async () => {
    const { fetchImpl } = network(() => response('en-ligne'))
    const { listeners } = boot(SOURCE, fetchImpl)
    await install(listeners)

    const { result } = dispatchFetch(listeners, {
      url: `${ORIGIN}/tableau-de-bord`,
      method: 'GET',
      mode: 'navigate',
    })
    expect(await result).toEqual({ ok: true, type: 'basic', body: 'en-ligne', clone: expect.any(Function) })
  })

  it('retourne une erreur réseau si le shell n’est pas en cache', async () => {
    const { fetchImpl } = network(() => new Error('offline'))
    const { listeners } = boot(SOURCE, fetchImpl)
    const { result } = dispatchFetch(listeners, {
      url: `${ORIGIN}/faq`,
      method: 'GET',
      mode: 'navigate',
    })
    expect(await result).toEqual({ ok: false, error: true })
  })

  it('sert les fichiers précache sans toucher au réseau', async () => {
    const { fetchImpl, calls } = network(() => response('réseau'))
    const { listeners } = boot(SOURCE, fetchImpl)
    await install(listeners)

    const { result } = dispatchFetch(listeners, { url: `${ORIGIN}/assets/index-abc123.js`, method: 'GET' })
    expect(await result).toBe(`precache:${ORIGIN}/assets/index-abc123.js`)
    expect(calls).toHaveLength(0)
  })

  it('met en cache les ressources same-origin après un premier passage', async () => {
    const { fetchImpl, calls } = network(() => response('image'))
    const { listeners, cacheStorage } = boot(SOURCE, fetchImpl)
    await install(listeners)

    const { result } = dispatchFetch(listeners, { url: `${ORIGIN}/images/86dde5ac8_Logo.png`, method: 'GET' })
    expect(await result).toEqual({ ok: true, type: 'basic', body: 'image', clone: expect.any(Function) })
    expect(calls).toHaveLength(1)

    await flush()
    const cached = await cacheStorage.match(`${ORIGIN}/images/86dde5ac8_Logo.png`)
    expect(cached && cached.body).toBe('image')
  })

  it("retourne une erreur réseau quand une ressource manque hors ligne", async () => {
    const { fetchImpl } = network(() => new Error('offline'))
    const { listeners } = boot(SOURCE, fetchImpl)
    const { result } = dispatchFetch(listeners, { url: `${ORIGIN}/images/absent.png`, method: 'GET' })
    expect(await result).toEqual({ ok: false, error: true })
  })

  it('ne laisse jamais le navigateur aller au réseau pour un cross-origin', () => {
    const { fetchImpl } = network(() => response('réseau'))
    const { listeners } = boot(SOURCE, fetchImpl)
    const externes = [
      { url: 'https://overpass-api.de/api/interpreter', method: 'POST' },
      { url: 'https://photon.komoot.io/api/?q=paris', method: 'GET' },
      { url: 'https://router.project-osrm.org/route/v1/driving/2,48;4,45', method: 'GET' },
      { url: 'https://tile.openstreetmap.org/12/2046/1394.png', method: 'GET' },
      { url: 'https://fonts.googleapis.com/css2?family=Inter', method: 'GET' },
    ]
    for (const request of externes) {
      expect(dispatchFetch(listeners, request).intercepted).toBe(false)
    }
  })

  it('ignore sw.js, les requêtes non-GET et les URLs invalides', () => {
    const { fetchImpl } = network(() => response('réseau'))
    const { listeners } = boot(SOURCE, fetchImpl)
    expect(dispatchFetch(listeners, { url: `${ORIGIN}/sw.js`, method: 'GET' }).intercepted).toBe(false)
    expect(dispatchFetch(listeners, { url: `${ORIGIN}/api/export`, method: 'POST' }).intercepted).toBe(false)
    expect(dispatchFetch(listeners, { url: 'pas-une-url', method: 'GET' }).intercepted).toBe(false)
  })
})
