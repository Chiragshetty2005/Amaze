import { useWordReveal } from '../../hooks/useWordReveal'

const tagline = 'Your health should not wait for office hours.'
const words = tagline.split(' ')

export function TaglineReveal() {
  const { ref, activeCount } = useWordReveal(words.length)

  return (
    <section className="bg-surface">
      <div className="container-page py-16 lg:py-24">
        <div ref={ref} className="max-w-hero">
          <p className="heading-section text-ink">
            <span className="sr-only">{tagline}</span>
            <span aria-hidden="true">
              {words.map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  style={{
                    opacity: index < activeCount ? 1 : 0.5,
                    transition:
                      'opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {word}
                  {index < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
