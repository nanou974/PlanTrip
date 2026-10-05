import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { isGeoPoint } from '../domain/itinerary.js'
import { labelMarker } from '../lib/leaflet-a11y.js'
import { Pill } from '../design/ui.jsx'
import { useOnlineStatus } from '../lib/online.js'

const DOT_COLOR = {
  start: '#2E7D5B',
  end: '#2B2F33',
  stop: '#FFBA3D',
  poi: '#1E3A5F',
}

function dotIcon(kind, size = 16) {
  const color = DOT_COLOR[kind] || DOT_COLOR.stop
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(43,47,51,.45)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/**
 * Carte Leaflet autonome : tracé + marqueurs, sans état global.
 * @param {Array<[number,number]>} coordinates format GeoJSON [lon, lat]
 * @param {Array<{lat:number,lon:number,label?:string,kind?:string}>} markers
 */
export default function MapView({
  coordinates = [],
  markers = [],
  height = 360,
  interactive = true,
  className = '',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const online = useOnlineStatus()

  useEffect(() => {
    if (!containerRef.current) return undefined
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      dragging: interactive,
      zoomControl: interactive,
      doubleClickZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [interactive])

  const signature = JSON.stringify({ c: coordinates, m: markers })

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    const payload = JSON.parse(signature)
    const coords = payload.c || []
    const pins = payload.m || []
    layer.clearLayers()

    const latlngs = coords
      .filter((c) => Array.isArray(c) && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])))
      .map(([lon, lat]) => [Number(lat), Number(lon)])

    if (latlngs.length >= 2) {
      L.polyline(latlngs, {
        color: '#2E7D5B',
        weight: 5,
        opacity: 0.88,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer)
    }

    const markerLatLngs = []
    for (const m of pins) {
      if (!isGeoPoint(m)) continue
      const ll = [Number(m.lat), Number(m.lon)]
      markerLatLngs.push(ll)
      const marker = L.marker(ll, { icon: dotIcon(m.kind) })
      marker.bindPopup(m.label ? `<b>${escapeHtml(m.label)}</b>` : '')
      labelMarker(marker, m.label || 'Point de l’itinéraire')
      marker.addTo(layer)
    }

    const bounds = latlngs.length >= 2 ? latlngs : markerLatLngs
    if (bounds.length >= 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: bounds.length === 1 ? 12 : 11 })
    } else {
      map.setView([46.6, 2.4], 6)
    }
  }, [signature])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const id = setTimeout(() => map.invalidateSize(), 60)
    return () => clearTimeout(id)
  }, [signature, height])

  return (
    <div
      ref={containerRef}
      className={`relative z-0 overflow-hidden rounded-xl border border-pt-line ${className}`}
      style={{ height }}
      role="region"
      aria-label="Carte de l’itinéraire"
    >
      {!online && (
        <div className="absolute left-2 bottom-2 z-500">
          <Pill tone="orange" icon="info">
            Fond de carte hors connexion
          </Pill>
        </div>
      )}
    </div>
  )
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
