import { Icon } from '../design/Icon.jsx'
import { SAFETY_SOURCE, safetyChecksFor } from '../domain/safety.js'

/** Contrôles de sécurité avant le départ, groupés et repliables (le premier groupe est ouvert). */
export default function SafetyChecks({ vehicleSlug }) {
  const groups = safetyChecksFor(vehicleSlug)
  if (!groups.length) return null
  return (
    <div className="mt-4 pt-4 border-t border-pt-line" data-testid="safety-checks">
      <p className="font-semibold text-sm flex items-center gap-1.5">
        <Icon name="shield" size={16} className="shrink-0 text-pt-green-ink" />
        Contrôles de sécurité avant le départ
      </p>
      <p className="text-xs text-pt-neutral/75 mt-1">
        Quelques minutes la veille du départ. Repères généraux : la notice de votre véhicule fait foi.
      </p>
      <div className="mt-3 grid gap-2">
        {groups.map((group, i) => (
          <details key={group.id} open={i === 0} className="rounded-xl border border-pt-line bg-pt-cream p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              {group.title} <span className="font-normal text-pt-neutral/75">({group.items.length})</span>
            </summary>
            <ul className="mt-2 grid gap-2 text-sm">
              {group.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <Icon name="check-circle" size={16} className="shrink-0 mt-0.5 text-pt-green-ink" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <p className="text-xs text-pt-neutral/75 mt-3">
        Source des obligations citées :{' '}
        <a href={SAFETY_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline text-pt-green-ink">
          {SAFETY_SOURCE.label}
          <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
        </a>{' '}
        et loi Montagne.
      </p>
    </div>
  )
}
