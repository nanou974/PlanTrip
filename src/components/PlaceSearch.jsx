import { useEffect, useRef, useState } from 'react'
import { Icon } from '../design/Icon.jsx'
import { Spinner } from '../design/ui.jsx'
import { searchPlaces } from '../services/geocoding.js'

/**
 * Recherche de lieu (Photon/OSM) avec autocomplétion debounce.
 * @param {(place:{name:string,lat:number,lon:number}) => void} onSelect
 */
export default function PlaceSearch({
  onSelect,
  placeholder = 'Rechercher une ville…',
  label = 'Rechercher un lieu',
  autoFocus = false,
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const timerRef = useRef(null)
  const abortRef = useRef(null)
  const blurRef = useRef(null)

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      clearTimeout(blurRef.current)
      abortRef.current?.abort()
    },
    [],
  )

  function runSearch(value) {
    clearTimeout(timerRef.current)
    abortRef.current?.abort()
    if (value.trim().length < 2) {
      setResults([])
      setError('')
      setLoading(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError('')
      try {
        const found = await searchPlaces(value, { signal: controller.signal })
        setResults(found)
        setOpen(true)
        setHighlight(found.length ? 0 : -1)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError('Recherche impossible — vérifiez votre connexion.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function choose(place) {
    setQuery('')
    setResults([])
    setOpen(false)
    setError('')
    onSelect?.(place)
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((h) => Math.min(results.length - 1, h + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const picked = results[highlight >= 0 ? highlight : 0]
      if (picked) choose(picked)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <label className="field-label" htmlFor="place-search">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-pt-neutral/70">
          <Icon name="pin" size={17} />
        </span>
        <input
          id="place-search"
          type="search"
          className="field-input pl-9 pr-9"
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            runSearch(e.target.value)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurRef.current = setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <span className="absolute inset-y-0 right-3 flex items-center text-pt-neutral/75">
            <Spinner size={16} />
          </span>
        )}
      </div>

      {open && (error || results.length > 0) && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-pt-line bg-white shadow-lg">
          {error && <li className="px-3 py-2.5 text-sm text-pt-danger">{error}</li>}
          {results.map((place, index) => (
            <li key={place.id}>
              <button
                type="button"
                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  index === highlight ? 'bg-pt-green-soft' : 'hover:bg-pt-cream'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(place)}
                onMouseEnter={() => setHighlight(index)}
              >
                <Icon name="pin" size={15} className="mt-0.5 shrink-0 text-pt-green-ink" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{place.name}</span>
                  {place.context && place.context !== place.name && (
                    <span className="block truncate text-xs text-pt-neutral/75">{place.context}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
