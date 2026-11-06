import { useEffect } from 'react'
import { Hero } from '../components/landing/Hero'
import { SpecialtyStrip } from '../components/landing/SpecialtyStrip'
import { ProblemSolution } from '../components/landing/ProblemSolution'
import { Benefits } from '../components/landing/Benefits'
import { HowItWorks } from '../components/landing/HowItWorks'
import { TaglineReveal } from '../components/landing/TaglineReveal'
import { Testimonials } from '../components/landing/Testimonials'
import { Faq } from '../components/landing/Faq'
import { RiskReversal } from '../components/landing/RiskReversal'
import { FinalCta } from '../components/landing/FinalCta'
import { Reveal } from '../components/ui/Reveal'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { faqs } from '../mocks/data'

export function LandingPage() {
  useDocumentMeta({
    title: 'AmazeCare | Book the right specialist',
    description:
      'Book appointments with 11 specialists across 8 departments. See live availability, keep prescriptions and bills in one place, and get email confirmations.',
    robots: 'index,follow',
  })

  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'amazecare-faq-schema'
    script.textContent = JSON.stringify(schema)
    document.head.appendChild(script)

    return () => {
      document.getElementById('amazecare-faq-schema')?.remove()
    }
  }, [])

  return (
    <>
      <Hero />
      <Reveal>
        <SpecialtyStrip />
      </Reveal>
      <Reveal>
        <ProblemSolution />
      </Reveal>
      <Reveal>
        <Benefits />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <TaglineReveal />
      <Reveal>
        <Testimonials />
      </Reveal>
      <Reveal>
        <Faq />
      </Reveal>
      <Reveal>
        <RiskReversal />
      </Reveal>
      <Reveal>
        <FinalCta />
      </Reveal>
    </>
  )
}
