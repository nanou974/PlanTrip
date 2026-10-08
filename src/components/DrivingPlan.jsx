import { useEffect, useMemo, useState } from 'react'
import { Card, Pill, SectionHeader } from '../design/ui.jsx'
import { Icon } from '../design/Icon.jsx'
import { formatDuration, plural } from '../domain/format.js'
import { LODGING_TYPES, lodgingTypesFor } from '../domain/lodging.js'
import { offerLinks } from '../domain/offers.js'
import { BREAK_EVERY_SEC, BREAK_MAX_MINUTES, BREAK_MIN_MINUTES, MAX_DAY_SEC, STOP_RADIUS_KM, lodgingNear } from '../domain/driving.js'
import { reversePlace } from '../services/geocoding.js'
import { PRICED_TYPES, fetchLodgingPrices, formatObservedRange } from '../services/lodgingPrices.js'

function breakSentence(breaks, driveSec) {
  if (breaks.count === 0) {
    return `Moins de 2 h de conduite d’affilée : pas de pause systématique, mais arrêtez-vous dès les premiers signes de fatigue.`
  }
  const total =
    breaks.minMinutes === breaks.maxMinutes ? `${breaks.minMinutes} min` : `${breaks.minMinutes} à ${breaks.maxMinutes} min`
  return `Prévoyez ${plural(breaks.count, 'pause', 'pauses')} par journée de ${formatDuration(driveSec)} de conduite, soit environ ${total} d’arrêt en plus.`
}

/**
 * « Conduite et étapes de nuit » : découpage du trajet en journées, pauses conseillées,
 * lieu approximatif de chaque nuit en route et hébergements à proximité.
 */
export default function DrivingPlan({ plan, roundTrip, nights, accommodations, accomLoading, vehicleSlug }) {
  const [names, setNames] = useState({})
  const [prices, setPrices] = useState({})
  const pricedTypes = useMemo(() => lodgingTypesFor(vehicleSlug).filter((t) => PRICED_TYPES.includes(t)), [vehicleSlug])
  const stopKey = useMemo(() => (plan?.stops || []).map((s) => `${s.lat},${s.lon}`).join('|'), [plan])

  useEffect(() => {
    const ctrl = new AbortController()
    let alive = true
    ;(plan?.stops || []).forEach((stop, i) => {
      if (!Number.isFinite(stop.lat)) return
      reversePlace(stop.lat, stop.lon, { signal: ctrl.signal })
        .then((place) => {
          const label = place?.city || place?.short
          if (alive && label) setNames((prev) => ({ ...prev, [`${stopKey}#${i}`]: label }))
        })
        .catch(() => {})
    })
    return () => {
      alive = false
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopKey])

  useEffect(() => {
    let alive = true
    ;(plan?.stops || []).forEach((stop, i) => {
      if (!Number.isFinite(stop.lat)) return
      pricedTypes.forEach((type) => {
        fetchLodgingPrices({ lat: stop.lat, lon: stop.lon, type }).then((data) => {
          if (alive && data) setPrices((prev) => ({ ...prev, [`${stopKey}#${i}|${type}`]: data }))
        })
      })
    })
    return () => {
      alive = false
    }
  }, [stopKey, pricedTypes]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) return null
  const { days, perDaySec, breaks, stops, roadNights, tooShort } = plan

  return (
    <Card>
      <SectionHeader
        title="Conduite, pauses et étapes de nuit"
        subtitle={
          days > 1
            ? `${plural(days, 'journée', 'journées')} de route · environ ${formatDuration(perDaySec)} par jour`
            : `Une seule journée de route · ${formatDuration(perDaySec)} de conduite`
        }
      />

      {tooShort && (
        <div role="alert" className="mb-3 rounded-xl border-2 border-pt-orange bg-pt-orange-soft p-3 text-sm text-pt-orange-ink">
          <p className="font-semibold flex items-center gap-1.5">
            <Icon name="info" size={16} className="shrink-0" />
            Vos dates sont trop courtes pour ce trajet
          </p>
          <p className="mt-1">
            Pour garder {formatDuration(MAX_DAY_SEC)} de conduite par jour au maximum, il faut {plural(roadNights, 'nuit', 'nuits')} en
            route{roundTrip ? ' (aller et retour)' : ''} ; votre voyage en compte {nights}. Allongez les dates ou choisissez une destination
            plus proche.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <Pill tone="blue" icon="clock">
          Pause de {BREAK_MIN_MINUTES} à {BREAK_MAX_MINUTES} min au moins toutes les {formatDuration(BREAK_EVERY_SEC)}
        </Pill>
        {roadNights > 0 && (
          <Pill tone="blue" icon="bed">
            {plural(roadNights, 'nuit', 'nuits')} en route
          </Pill>
        )}
      </div>
      <p className="text-sm text-pt-neutral/80">{breakSentence(breaks, perDaySec)}</p>
      <p className="text-xs text-pt-neutral/75 mt-1">
        Repère de la Prévention Routière : 15 à 20 minutes au moins toutes les 2 heures. Durées calculées d’après l’itinéraire, sans
        circulation ni arrêts.
      </p>

      {stops.length > 0 && (
        <ol className="mt-4 grid gap-3" aria-label="Étapes de nuit en route">
          {stops.map((stop, i) => {
            const name = names[`${stopKey}#${i}`]
            const near = lodgingNear(stop, accommodations)
            const priceLines = pricedTypes
              .map((type) => ({ type, data: prices[`${stopKey}#${i}|${type}`] }))
              .filter((p) => p.data)
            const links = name ? offerLinks({ destinationName: name, travelers: 1, vehicleSlug }).slice(0, 2) : []
            return (
              <li key={stop.night} className="rounded-xl border border-pt-line bg-pt-cream p-3" data-testid="driving-stop">
                <p className="font-semibold text-sm">
                  Nuit {stop.night}
                  {name ? ` · près de ${name}` : ''}
                </p>
                <p className="text-xs text-pt-neutral/75" data-testid="driving-day">
                  Jour {i + 1} : environ {formatDuration(stop.afterSec - (i > 0 ? stops[i - 1].afterSec : 0))} de conduite pour y arriver
                  {roundTrip ? ' (aller ; même logique au retour)' : ''}
                </p>
                {accomLoading && !near.length ? (
                  <p className="text-xs text-pt-neutral/75 mt-2">Recherche d’hébergements…</p>
                ) : near.length ? (
                  <ul className="mt-2 grid gap-1 text-sm">
                    {near.slice(0, 3).map((a) => (
                      <li key={a.id}>
                        <span className="font-medium">{a.name}</span>{' '}
                        <span className="text-xs text-pt-neutral/75">
                          · {LODGING_TYPES[a.type]?.label || 'Hébergement'} · à {Math.round(a.fromStopKm)} km de l’étape
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-pt-neutral/75 mt-2">
                    Aucun hébergement référencé à moins de {STOP_RADIUS_KM} km dans OpenStreetMap : cherchez directement chez nos
                    partenaires.
                  </p>
                )}
                {priceLines.length > 0 && (
                  <p className="text-xs mt-2" data-testid="stop-prices">
                    <span className="font-semibold">Tarifs relevés autour de l’étape :</span>{' '}
                    {priceLines.map((p) => `${LODGING_TYPES[p.type].label} ${formatObservedRange(p.data)}`).join(' · ')}
                    <span className="text-pt-neutral/75"> la nuit, prix « à partir de » (DATAtourisme, à vérifier).</span>
                  </p>
                )}
                {links.length > 0 && (
                  <p className="text-xs mt-2 flex flex-wrap gap-x-3">
                    {links.map((l) => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-pt-green-ink"
                        aria-label={`${l.label} près de ${name} — s’ouvre dans un nouvel onglet`}
                      >
                        {l.label} près de {name}
                      </a>
                    ))}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {stops.length > 0 && Number.isFinite(plan.legSec) && (
        <p className="mt-3 text-sm" data-testid="driving-last-day">
          <span className="font-semibold">Jour {days} :</span> environ {formatDuration(plan.legSec - stops[stops.length - 1].afterSec)} de
          conduite jusqu’à la destination.
        </p>
      )}
    </Card>
  )
}
