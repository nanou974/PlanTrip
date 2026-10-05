import { isPasswordHashingAvailable, PASSWORD_UNAVAILABLE_MESSAGE } from '../lib/password.js'

/**
 * Affiche l'obstacle avant l'effort : sans contexte sécurisé, aucun mot de passe
 * ne peut être haché ni vérifié. Le message reste celui du refus réel.
 */
export default function AuthSecurityNotice({ className = '' }) {
  if (isPasswordHashingAvailable()) return null

  return (
    <div
      role="alert"
      className={`rounded-xl border border-pt-danger/30 bg-pt-danger-soft p-3 text-sm text-pt-danger ${className}`}
    >
      {PASSWORD_UNAVAILABLE_MESSAGE}
    </div>
  )
}
