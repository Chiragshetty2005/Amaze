import { SectionIntro } from '../ui/SectionIntro'
import { Avatar } from '../ui/Avatar'
import { testimonials } from '../../mocks/data'

export function Testimonials() {
  const [featured, ...rest] = testimonials

  return (
    <section className="section-pad bg-paper">
      <div className="container-page flex flex-col gap-10">
        <SectionIntro
          title="Patients notice the difference."
          description="Real words from the demo patients who booked through AmazeCare."
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <figure className="card-flat flex flex-col justify-between gap-8">
            <blockquote className="heading-5 max-w-2xl text-ink">
              “{featured.quote}”
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <Avatar name={featured.name} size="md" />
              <div>
                <p className="title-4 text-ink">{featured.name}</p>
                <p className="caption-5 text-ink/70">{featured.context}</p>
              </div>
            </figcaption>
          </figure>

          <div className="flex flex-col gap-6">
            {rest.map((testimonial) => (
              <figure
                key={testimonial.name}
                className="flex flex-1 flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6"
              >
                <blockquote className="body-3 text-ink">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <Avatar name={testimonial.name} size="sm" />
                  <div>
                    <p className="title-4 text-ink">{testimonial.name}</p>
                    <p className="caption-5 text-muted">
                      {testimonial.context}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
