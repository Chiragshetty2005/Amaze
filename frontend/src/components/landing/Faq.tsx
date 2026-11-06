import { FaqAccordion } from '../ui/FaqAccordion'
import { faqs } from '../../mocks/data'

export function Faq() {
  return (
    <section id="faq" className="section-pad bg-surface">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 className="heading-section max-w-sm text-ink">
            Questions before you book.
          </h2>
          <p className="max-w-sm body-6 text-muted">
            The short answers to what patients ask most. If something is still
            unclear, the care team is one email away.
          </p>
          <p className="body-6 text-muted">
            Still unsure?{' '}
            <a href="mailto:care@amazecare.example" className="link">
              Email the care team
            </a>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-4">
          <FaqAccordion
            items={faqs.map((faq, index) => ({
              value: `faq-${index}`,
              question: faq.question,
              answer: faq.answer,
            }))}
          />
        </div>
      </div>
    </section>
  )
}
