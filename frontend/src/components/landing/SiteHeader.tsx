import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link, useLocation } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { Logo } from '../brand/Logo'
import { buttonStyles } from '../ui/Button'
import { cn } from '../../lib/cn'
import { useScrollSpy } from '../../hooks/useScrollSpy'

const sectionLinks = [
  { id: 'specialties', label: 'Specialties' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'faq', label: 'FAQ' },
]

export function SiteHeader() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const activeSection = useScrollSpy([
    'hero',
    'specialties',
    'how-it-works',
    'faq',
  ])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const sectionHref = (id: string) => (isLanding ? `#${id}` : `/#${id}`)

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4">
      <nav
        className={cn(
          'nav-surface mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 transition-colors duration-300 ease-out-expo',
          scrolled && 'bg-surface/95',
        )}
        aria-label="Main navigation"
      >
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          aria-label="AmazeCare home"
        >
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {sectionLinks.map((link) => (
            <a
              key={link.id}
              href={sectionHref(link.id)}
              className={cn(
                'nav-link',
                isLanding && activeSection === link.id && 'nav-link-active',
              )}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/find-a-doctor"
            className={cn(
              'nav-link',
              location.pathname.startsWith('/find-a-doctor') && 'nav-link-active',
            )}
          >
            Doctors
          </Link>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/login" className="nav-link">
            Sign in
          </Link>
          <Link to="/find-a-doctor" className={buttonStyles({ size: 'sm' })}>
            Book an appointment
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/find-a-doctor"
            className={buttonStyles({ size: 'sm', className: 'hidden sm:inline-flex' })}
          >
            Book an appointment
          </Link>
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="icon-btn text-ink hover:bg-mint"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                <span className="relative flex h-5 w-5 flex-col justify-center gap-1.5">
                  <span
                    className={cn(
                      'block h-0.5 w-5 rounded-full bg-ink transition-transform duration-300 ease-out-expo',
                      menuOpen && 'translate-y-1 rotate-45',
                    )}
                  />
                  <span
                    className={cn(
                      'block h-0.5 w-5 rounded-full bg-ink transition-transform duration-300 ease-out-expo',
                      menuOpen && '-translate-y-1 -rotate-45',
                    )}
                  />
                </span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-ink/30" />
              <Dialog.Content className="dialog-mobile fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface/95 p-6 backdrop-blur-xl">
                <Dialog.Title className="sr-only">Menu</Dialog.Title>
                <div className="flex items-center justify-between">
                  <Link to="/" aria-label="AmazeCare home">
                    <Logo />
                  </Link>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="icon-btn text-ink hover:bg-mint"
                      aria-label="Close menu"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="mt-12 flex flex-col gap-2">
                  {[
                    ...sectionLinks.map((link) => ({
                      label: link.label,
                      href: sectionHref(link.id),
                    })),
                    { label: 'Doctors', href: '/find-a-doctor' },
                  ].map((link, index) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="mobile-menu-link flex items-center justify-between rounded-xl px-2 py-3 heading-4 text-ink hover:bg-mint"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div
                  className="mobile-menu-link mt-8 flex flex-col gap-3"
                  style={{ animationDelay: '240ms' }}
                >
                  <Link
                    to="/find-a-doctor"
                    onClick={() => setMenuOpen(false)}
                    className={buttonStyles({ className: 'w-full' })}
                  >
                    Book an appointment
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className={buttonStyles({
                      variant: 'secondary',
                      className: 'w-full',
                    })}
                  >
                    Sign in
                  </Link>
                </div>
                <p className="mt-auto pt-8 caption-5 text-muted">
                  AmazeCare is an internship demo. Do not enter real medical
                  data.
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>
    </header>
  )
}
