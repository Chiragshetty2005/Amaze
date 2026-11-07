import {
  CalendarCheck,
  FolderOpen,
  Pill,
  Receipt,
  Stethoscope,
} from '@phosphor-icons/react'
import { SectionIntro } from '../ui/SectionIntro'

const secondaryBenefits = [
  {
    icon: Stethoscope,
    title: 'Find the right specialist',
    description:
      'Filter by department, experience, and the next open slot. No guessing about who treats what.',
  },
  {
    icon: CalendarCheck,
    title: 'Book in minutes',
    description:
      'Choose a real time from live availability and get an email confirmation as soon as the doctor accepts.',
  },
  {
    icon: Pill,
    title: 'Read every prescription',
    description:
      'Dosage is written as 0-0-1 with AF or BF, so the instructions are clear before you leave the clinic.',
  },
  {
    icon: Receipt,
    title: 'Leave with your bill',
    description:
      'Download your invoice as a PDF or have it emailed to you. Payment stays at the clinic.',
  },
]

export function Benefits() {
  return (
    <section className="section-pad bg-paper">
      <div className="container-page flex flex-col gap-10">
        <SectionIntro
          title="Everything that usually gets lost, in one place."
          description="The appointment is only one part of a visit. AmazeCare keeps the details that matter before, during, and after."
        />

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="card-flat flex flex-col justify-between gap-8">
            <div className="flex flex-col gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary">
                <FolderOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="heading-4 max-w-xs text-ink">
                One record for every visit
              </h3>
              <p className="body-6 text-ink/70">
                Symptoms, physical exam notes, treatment plans, recommended
                tests, prescriptions, and bills live together. No folder of
                loose paper, no searching through email.
              </p>
            </div>
            <p className="caption-4 text-ink/70">
              Built for patients who want the details without the chase.
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
            {secondaryBenefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.title} className="flex flex-col gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mint text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="title-1 text-ink">{benefit.title}</h3>
                  <p className="body-6 text-muted">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
