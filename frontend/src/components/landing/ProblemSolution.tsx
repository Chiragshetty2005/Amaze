import { CheckCircle } from '@phosphor-icons/react'

const changes = [
  'See real availability before you commit.',
  'Confirm without a phone call.',
  'Keep the record after the visit.',
]

export function ProblemSolution() {
  return (
    <section className="section-pad bg-surface">
      <div className="container-page grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="flex flex-col gap-5">
          <h2 className="heading-section max-w-lg text-ink">
            The phone call is the slowest part of care.
          </h2>
          <p className="max-w-sm body-6 text-muted">
            Most appointment systems make you call during working hours, wait
            on hold, and repeat your details. AmazeCare shows you who is
            available, when, and what happens next.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <p className="body-2 text-ink">
            No hold music. No paper slip lost in a bag. Your visit,
            prescription, and bill stay together.
          </p>
          <p className="body-6 text-muted">
            Book from any device, get a confirmation email, and walk in knowing
            what to expect. After the consultation, everything your doctor
            recorded is waiting in the same place.
          </p>
          <ul className="mt-2 grid gap-3 sm:grid-cols-3">
            {changes.map((change) => (
              <li
                key={change}
                className="flex items-start gap-2 body-6 text-ink"
              >
                <CheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {change}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
