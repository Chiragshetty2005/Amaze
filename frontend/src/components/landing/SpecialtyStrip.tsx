import { Link } from 'react-router-dom'
import { specializations } from '../../mocks/data'
import { SpecialtyIcon } from './SpecialtyIcon'

export function SpecialtyStrip() {
  return (
    <section id="specialties" className="bg-mint">
      <div className="container-page section-pad">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="heading-5 text-ink">Care across eight departments</h2>
            <p className="body-6 text-ink/70">
              Every department lists its specialists and live availability.
            </p>
          </div>
          <Link
            to="/find-a-doctor"
            className="link inline-flex items-center gap-2 text-sm"
          >
            See all doctors
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {specializations.map((specialization) => (
            <li key={specialization.id}>
              <Link
                to={`/find-a-doctor?specialty=${specialization.id}`}
                className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-300 ease-out-expo hover:bg-surface/70"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
                  <SpecialtyIcon
                    id={specialization.id}
                    className="h-4 w-4"
                  />
                </span>
                <span className="title-4 text-ink group-hover:text-primary">
                  {specialization.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
