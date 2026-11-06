import { SectionIntro } from '../ui/SectionIntro'

const steps = [
  {
    number: '01',
    title: 'Choose a department',
    description:
      'See every specialist, their experience, and the next open slots in that department.',
  },
  {
    number: '02',
    title: 'Pick a time',
    description:
      'Select a live slot, add a short note about your visit, and confirm your details.',
  },
  {
    number: '03',
    title: 'Arrive ready',
    description:
      'Get a confirmation email, then find your prescription and bill in your record after the visit.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-mint">
      <div className="container-page section-pad">
        <SectionIntro
          title="Three steps from symptom to seen."
          description="No account maze. No callbacks. Just the next clear step."
        />

        <div className="relative mt-10 grid gap-8 md:grid-cols-3">
          <div
            className="absolute left-0 right-0 top-4 hidden h-px bg-ink/15 md:block"
            aria-hidden="true"
          />
          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface body-4 font-mono text-primary">
                {step.number}
              </span>
              <h3 className="title-1 text-ink">{step.title}</h3>
              <p className="max-w-xs body-6 text-ink/70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
