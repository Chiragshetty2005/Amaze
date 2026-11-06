import { Link } from 'react-router-dom'
import { buttonStyles } from '../ui/Button'

export function FinalCta() {
  return (
    <section className="bg-mint">
      <div className="container-page section-pad flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="heading-section max-w-xl text-ink">
            Your next appointment is a few clicks away.
          </h2>
          <p className="max-w-md body-6 text-ink/70">
            See live availability, pick a slot, and get an email confirmation.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <Link to="/find-a-doctor" className={buttonStyles()}>
            Book an appointment
          </Link>
          <p className="caption-2 text-ink/60">
            11 specialists across 8 departments.
          </p>
        </div>
      </div>
    </section>
  )
}
