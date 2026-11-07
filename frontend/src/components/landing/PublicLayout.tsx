import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useScrollRevealScope } from '../../hooks/useScrollRevealScope'
import { SiteHeader } from '../landing/SiteHeader'
import { Footer } from '../landing/Footer'

export function PublicLayout() {
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  useScrollRevealScope(mainRef, pathname !== '/')

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main ref={mainRef} id="main" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
