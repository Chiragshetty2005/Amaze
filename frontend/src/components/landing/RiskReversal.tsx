import { CalendarCheck, CreditCard, PhoneSlash } from '@phosphor-icons/react'

const reassurances = [
  {
    icon: PhoneSlash,
    title: 'No phone calls',
    description: 'Book, reschedule, and cancel from your account.',
  },
  {
    icon: CreditCard,
    title: 'No card required',
    description: 'Create an account and book without payment details.',
  },
  {
    icon: CalendarCheck,
    title: 'Change your mind',
    description: 'Reschedule or cancel before your visit.',
  },
]

export function RiskReversal() {
  return (
    <section className="bg-paper">
      <div className="container-page flex flex-col gap-6 py-10 lg:py-12">
        <h2 className="heading-6 text-ink">Book without the usual friction.</h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {reassurances.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="title-4 text-ink">{item.title}</p>
                  <p className="body-6 text-muted">{item.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
