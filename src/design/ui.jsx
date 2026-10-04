import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon.jsx'

const cx = (...parts) => parts.filter(Boolean).join(' ')

/* ————————————————————————————————————————————————
   Boutons — planche 07/08 : primaire vert, secondaire blanc cadré
   ———————————————————————————————————————————————— */

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none select-none active:translate-y-px'

const BTN_SIZE = {
  sm: 'px-3 py-2 text-[13px] min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[42px]',
  lg: 'px-6 py-3.5 text-[15px] min-h-[48px]',
}

const BTN_VARIANT = {
  primary: 'bg-pt-green text-white hover:bg-pt-green-dark shadow-sm',
  secondary: 'bg-white text-pt-neutral border border-pt-line hover:border-pt-green hover:text-pt-green',
  accent: 'bg-pt-orange text-pt-neutral hover:brightness-95 shadow-sm',
  ghost: 'text-pt-neutral/70 hover:bg-pt-neutral/5 hover:text-pt-neutral',
  danger: 'bg-pt-danger-soft text-pt-danger hover:bg-pt-danger hover:text-white',
}

export function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  icon,
  iconRight,
  block,
  className,
  children,
  ...rest
}) {
  const cls = cx(BTN_BASE, BTN_SIZE[size], BTN_VARIANT[variant], block && 'w-full', className)
  const content = (
    <>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} strokeWidth={2} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} strokeWidth={2} />}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={cls} {...rest}>
      {content}
    </button>
  )
}

export function IconButton({ label, icon, size = 40, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex items-center justify-center rounded-xl text-pt-neutral/60 hover:text-pt-neutral hover:bg-pt-neutral/5 transition-colors',
        className,
      )}
      style={{ width: size, height: size, minWidth: size }}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}

/* ————————————————————————————————————————————————
   Conteneurs
   ———————————————————————————————————————————————— */

export function Card({ as: Tag = 'div', padded = true, className, children, ...rest }) {
  return (
    <Tag className={cx('card', padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function SectionHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-3 mb-4', className)}>
      <div>
        <h2 className="font-display font-semibold text-lg sm:text-xl tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-pt-neutral/60 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-pt-neutral/60 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function Divider({ className }) {
  return <div className={cx('h-px bg-pt-line', className)} />
}

/* ————————————————————————————————————————————————
   Badges & indicateurs
   ———————————————————————————————————————————————— */

const PILL_TONE = {
  neutral: 'bg-pt-light text-pt-neutral/70 border-transparent',
  green: 'bg-pt-green-soft text-pt-green border-pt-green/20',
  orange: 'bg-pt-orange-soft text-pt-orange-ink border-pt-orange/30',
  blue: 'bg-[#E8EEF4] text-pt-blue border-pt-blue/20',
  danger: 'bg-pt-danger-soft text-pt-danger border-pt-danger/20',
}

export function Pill({ tone = 'neutral', icon, className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap',
        PILL_TONE[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={2.2} />}
      {children}
    </span>
  )
}

export function Progress({ value, max = 100, tone = 'green', showLabel = false, className }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  const bar = { green: 'bg-pt-green', orange: 'bg-pt-orange', blue: 'bg-pt-blue', danger: 'bg-pt-danger' }[tone]
  return (
    <div className={cx('w-full', className)}>
      <div
        className="h-2 w-full rounded-full bg-pt-light overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cx('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <p className="text-xs text-pt-neutral/55 mt-1 text-right font-medium">{pct}%</p>}
    </div>
  )
}

export function Skeleton({ className, lines = 1 }) {
  if (lines > 1) {
    return (
      <div className={cx('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 rounded-full bg-pt-light animate-pulse"
            style={{ width: `${100 - i * 14}%` }}
          />
        ))}
      </div>
    )
  }
  return <div className={cx('h-4 rounded-full bg-pt-light animate-pulse', className)} />
}

export function Spinner({ size = 20, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cx('animate-spin', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ————————————————————————————————————————————————
   Champs de formulaire
   ———————————————————————————————————————————————— */

export function Field({ label, hint, error, required, children, id }) {
  const hintId = hint || error ? `${id}-hint` : undefined
  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label mb-1.5">
          {label}
          {required && <span className="text-pt-orange-ink ml-1">*</span>}
        </label>
      )}
      {typeof children === 'function'
        ? children({ describedBy: hintId, invalid: Boolean(error) })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-pt-neutral/50 mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={hintId} className="text-xs text-pt-danger mt-1.5 flex items-center gap-1.5">
          <Icon name="alert-circle" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({ id, error, className, ...rest }) {
  return (
    <input
      id={id}
      aria-invalid={error ? 'true' : undefined}
      className={cx('field-input', error && 'field-input-error', className)}
      {...rest}
    />
  )
}

export function TextArea({ id, error, className, rows = 4, ...rest }) {
  return (
    <textarea
      id={id}
      rows={rows}
      aria-invalid={error ? 'true' : undefined}
      className={cx('field-input resize-y min-h-[96px]', error && 'field-input-error', className)}
      {...rest}
    />
  )
}

export function SelectInput({ id, error, className, children, ...rest }) {
  return (
    <select
      id={id}
      aria-invalid={error ? 'true' : undefined}
      className={cx('field-input appearance-none pr-9 bg-no-repeat', error && 'field-input-error', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%232B2F33' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.75rem center',
      }}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, label, hint, id }) {
  return (
    <label
      htmlFor={id}
      className="flex items-start justify-between gap-4 cursor-pointer py-3"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-pt-neutral/55 mt-0.5">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-11 rounded-full bg-pt-light border border-pt-line transition-colors peer-checked:bg-pt-green peer-checked:border-pt-green peer-focus-visible:ring-2 peer-focus-visible:ring-pt-green/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function Checkbox({ checked, onChange, label, id, disabled }) {
  return (
    <label htmlFor={id} className={cx('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 pointer-events-none')}>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-pt-line bg-white transition-colors peer-checked:border-pt-green peer-checked:bg-pt-green peer-checked:[&_svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-pt-green/40">
          <Icon name="check" size={13} strokeWidth={3} className="text-white opacity-0 transition-opacity" />
        </span>
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}

/* ————————————————————————————————————————————————
   États
   ———————————————————————————————————————————————— */

export function EmptyState({ icon = 'compass', title, description, action, secondaryAction, className }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-pt-line bg-white/60 px-6 py-12',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pt-green-soft text-pt-green mb-4">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="font-display font-semibold text-base">{title}</h3>
      {description && <p className="text-sm text-pt-neutral/60 mt-1.5 max-w-sm">{description}</p>}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export function ErrorState({ title = 'Impossible de charger', description, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-pt-danger/25 bg-pt-danger-soft px-6 py-10',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-pt-danger mb-3">
        <Icon name="alert" size={22} />
      </span>
      <h3 className="font-display font-semibold text-base">{title}</h3>
      {description && <p className="text-sm text-pt-neutral/65 mt-1.5 max-w-sm">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry} className="mt-4">
          Réessayer
        </Button>
      )}
    </div>
  )
}

export function StatTile({ icon, label, value, hint, tone = 'green' }) {
  const toneClass = {
    green: 'bg-pt-green-soft text-pt-green',
    orange: 'bg-pt-orange-soft text-pt-orange-ink',
    blue: 'bg-[#E8EEF4] text-pt-blue',
    neutral: 'bg-pt-light text-pt-neutral/70',
  }[tone]
  return (
    <div className="card p-4 flex items-start gap-3">
      <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneClass)}>
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-pt-neutral/55 truncate">{label}</p>
        <p className="font-display font-semibold text-lg leading-tight mt-0.5 tabular-nums">{value}</p>
        {hint && <p className="text-[11px] text-pt-neutral/45 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}

/* ————————————————————————————————————————————————
   Onglets (navigation par route)
   ———————————————————————————————————————————————— */

export function TabBar({ items, className }) {
  return (
    <nav
      aria-label="Sections du voyage"
      className={cx(
        'flex gap-1 overflow-x-auto no-scrollbar border-b border-pt-line -mx-4 px-4 sm:mx-0 sm:px-0',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.active
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative flex items-center gap-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition-colors',
              active ? 'text-pt-green' : 'text-pt-neutral/55 hover:text-pt-neutral',
            )}
          >
            {item.icon && <Icon name={item.icon} size={16} />}
            {item.label}
            {active && <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-pt-green" />}
          </Link>
        )
      })}
    </nav>
  )
}

/* ————————————————————————————————————————————————
   Modale / tiroir mobile
   ———————————————————————————————————————————————— */

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-pt-neutral/40 backdrop-blur-[2px] animate-fade-up"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'relative w-full bg-white shadow-pop rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-fade-up outline-none',
          width,
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 sm:px-6 py-4 bg-white border-b border-pt-line">
          <h2 className="font-display font-semibold text-base sm:text-lg">{title}</h2>
          <IconButton label="Fermer" icon="close" onClick={onClose} size={36} />
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row gap-2 justify-end px-5 sm:px-6 py-4 bg-white border-t border-pt-line">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
