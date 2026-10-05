import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MarketingHeader from './MarketingHeader.jsx'
import Footer from './Footer.jsx'
import { OfflineIndicator } from '../lib/connectivity.jsx'

export default function PublicLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:z-60 focus:top-3 focus:left-3 focus:bg-white focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-pop focus:text-sm focus:font-semibold"
      >
        Aller au contenu
      </a>
      <MarketingHeader />
      <main id="contenu" className="flex-1 pt-16 lg:pt-20">
        <OfflineIndicator className="max-w-6xl mx-auto px-5 lg:px-8 mt-4" />
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
