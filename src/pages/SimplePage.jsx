import { Icon } from '../design/Icon.jsx'

export default function SimplePage({ title, subtitle, icon = 'book', eyebrow, children }) {
  return (
    <div>
      <section className="bg-pt-cream border-b border-pt-line">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 py-12 sm:py-16">
          {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
          <div className="flex items-start gap-4">
            {icon && (
              <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pt-green-soft text-pt-green-ink">
                <Icon name={icon} size={24} />
              </span>
            )}
            <div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">{title}</h1>
              {subtitle && <p className="text-pt-neutral/80 mt-2 text-[15px] leading-relaxed">{subtitle}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 py-10 sm:py-14 text-[15px] leading-relaxed text-pt-neutral/80">
          {children}
        </div>
      </section>
    </div>
  )
}
