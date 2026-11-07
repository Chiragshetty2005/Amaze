import { Link } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import { specializations } from '../../mocks/data'

const careLinks = [
  { label: 'Find a doctor', href: '/find-a-doctor' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Sign in', href: '/login' },
]

const aboutLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: 'mailto:care@amazecare.example' },
]

export function Footer() {
  return (
    <footer className="bg-mint">
      <div className="container-page flex flex-col gap-10 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex max-w-sm flex-col gap-4">
            <Link
              to="/"
              className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-mint"
              aria-label="AmazeCare home"
            >
              <Logo />
            </Link>
            <p className="body-6 text-ink/70">
              Appointments, records, and bills in one calm place. Built for
              people who would rather not spend the morning on hold.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="title-4 text-ink">Care</p>
            {careLinks.map((link) =>
              link.href.startsWith('mailto:') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="body-6 text-ink/70 hover:text-ink"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="body-6 text-ink/70 hover:text-ink"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="title-4 text-ink">Departments</p>
            {specializations.slice(0, 4).map((specialization) => (
              <Link
                key={specialization.id}
                to={`/find-a-doctor?specialty=${specialization.id}`}
                className="body-6 text-ink/70 hover:text-ink"
              >
                {specialization.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <p className="title-4 text-ink">About</p>
            {aboutLinks.map((link) =>
              link.href.startsWith('mailto:') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="body-6 text-ink/70 hover:text-ink"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="body-6 text-ink/70 hover:text-ink"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="caption-5 text-ink/70">
            © 2026 AmazeCare. All rights reserved.
          </p>
          <p className="caption-5 text-ink/70">
            Internship demo. Do not enter real medical data.
          </p>
        </div>
      </div>
    </footer>
  )
}
