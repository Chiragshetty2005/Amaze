import { Link, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import { testimonials } from '../../mocks/data'
import { cn } from '../../lib/cn'

export function AuthLayout() {
  const location = useLocation()
  const isWide = location.pathname === '/register'

  return (
    <div className="grid min-h-svh bg-paper lg:grid-cols-[0.86fr_1.14fr]">
      <aside className="sticky top-0 hidden h-svh flex-col justify-between overflow-hidden bg-mint p-10 lg:flex xl:p-16">
        <Link to="/" aria-label="AmazeCare home" className="w-fit">
          <Logo />
        </Link>

        <div className="flex max-w-lg flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="caption-3 text-ink/60">Patient access</p>
            <h1 className="heading-section text-ink">
              Care that fits around your day.
            </h1>
            <p className="body-3 text-ink/70">
              Book a specialist, keep every record in one place, and find the
              bill when you need it.
            </p>
          </div>

          <figure className="slip">
            <blockquote className="slip-inner flex flex-col gap-3 p-5">
              <span
                className="text-2xl leading-none text-primary"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="body-5 text-ink">{testimonials[0].quote}</p>
              <figcaption className="caption-5 text-muted">
                {testimonials[0].name}. {testimonials[0].context}.
              </figcaption>
            </blockquote>
          </figure>
        </div>

        <div className="flex flex-col gap-1 caption-5 text-ink/60">
          <p>AmazeCare Clinic, Indiranagar, Bengaluru</p>
          <p>Hospital workflow demo. No real patient data.</p>
        </div>
      </aside>

      <main className="flex min-h-svh flex-col">
        <header className="flex items-center justify-between gap-4 p-4 sm:p-6 lg:px-12">
          <Link
            to="/"
            aria-label="AmazeCare home"
            className="w-fit lg:invisible"
          >
            <Logo />
          </Link>
          <Link
            to="/"
            className="caption-4 text-muted transition-colors duration-300 ease-out-expo hover:text-ink"
          >
            Back to home
          </Link>
        </header>

        <div className="flex flex-1 items-start justify-center px-4 pb-12 pt-2 sm:px-6 lg:items-center lg:px-12 lg:pb-16 lg:pt-0">
          <div className={cn('w-full', isWide ? 'max-w-xl' : 'max-w-md')}>
            <Outlet />
          </div>
        </div>

        <footer className="px-4 pb-6 text-center sm:px-6 lg:px-12">
          <p className="caption-5 text-muted">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="link text-xs">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="link text-xs">
              Privacy Policy
            </Link>
            .
          </p>
        </footer>
      </main>
    </div>
  )
}
