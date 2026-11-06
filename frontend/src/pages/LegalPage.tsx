import { Link } from 'react-router-dom'
import { ArrowLeft, EnvelopeSimple } from '@phosphor-icons/react'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

interface LegalSection {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

interface LegalContent {
  eyebrow: string
  title: string
  intro: string
  sections: LegalSection[]
  contactEmail: string
}

function LegalShell({ content }: { content: LegalContent }) {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to AmazeCare
        </Link>

        <header className="flex flex-col gap-3 border-b border-line pb-8">
          <p className="caption-4 text-muted">{content.eyebrow}</p>
          <h1 className="heading-section text-ink">{content.title}</h1>
          <p className="max-w-2xl body-4 text-muted">{content.intro}</p>
          <p className="caption-5 text-muted">Last updated 6 November 2026.</p>
        </header>

        <div className="flex flex-col gap-8">
          {content.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="title-1 text-ink">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="body-5 text-ink/75">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="flex list-disc flex-col gap-2 pl-5 body-6 text-ink/75">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="title-1 text-ink">Questions</p>
          <p className="body-6 text-muted">
            Write to the AmazeCare team and we will respond within two working
            days.
          </p>
          <a
            href={`mailto:${content.contactEmail}`}
            className="link inline-flex w-fit items-center gap-2 text-sm"
          >
            <EnvelopeSimple className="h-4 w-4" aria-hidden="true" />
            {content.contactEmail}
          </a>
        </footer>
      </div>
    </div>
  )
}

const privacy: LegalContent = {
  eyebrow: 'Legal',
  title: 'Privacy notice',
  intro:
    'AmazeCare handles appointment and clinical information with care. This notice explains what this demonstration stores, why it is used, and the choices you have.',
  contactEmail: 'privacy@amazecare.test',
  sections: [
    {
      title: 'What this demo collects',
      paragraphs: [
        'When you create an account or book an appointment, the demo stores the name, email address, phone number, and profile photo you provide. It also stores appointment details, consultation notes, prescriptions, test orders, and invoices.',
        'This is a frontend demonstration. No real patient data should be entered, and no information is sent to a server.',
      ],
      bullets: [
        'Account details such as name, email address, and phone number.',
        'Appointment requests, visit notes, prescriptions, and billing records.',
        'Profile photos you choose to upload in the browser.',
      ],
    },
    {
      title: 'Where the data lives',
      paragraphs: [
        'All demo data is kept in your browser local storage. It stays on this device and is not transmitted to AmazeCare or any third party.',
        'Clearing browser storage removes the demo data. Signing out does not delete the clinical records stored for the demo accounts.',
      ],
    },
    {
      title: 'How information is used',
      paragraphs: [
        'The demo uses your information to show appointments, clinical records, bills, and reports. It also uses the details to demonstrate email confirmation and password reset flows without sending real email.',
      ],
    },
    {
      title: 'Sharing and access',
      paragraphs: [
        'Role based access is simulated in the interface. A patient sees their own records, a doctor sees patients linked to their schedule, and an administrator sees clinic operations.',
        'There are no analytics scripts, advertising trackers, or third party integrations in this demo.',
      ],
    },
    {
      title: 'Your choices',
      paragraphs: [
        'You can update your profile, change your password, or clear browser storage at any time. To ask a question about the intended production privacy program, contact the team using the address below.',
      ],
    },
    {
      title: 'Children',
      paragraphs: [
        'The demo is intended for adults evaluating the AmazeCare product. It is not directed at children, and children should not create demo accounts.',
      ],
    },
    {
      title: 'Changes',
      paragraphs: [
        'This notice may change as the product moves from demonstration to production. The updated date at the top of this page will reflect the latest revision.',
      ],
    },
  ],
}

const terms: LegalContent = {
  eyebrow: 'Legal',
  title: 'Terms of use',
  intro:
    'These terms describe the rules for using the AmazeCare demonstration. By using the demo, you agree to use it responsibly and understand its limits.',
  contactEmail: 'care@amazecare.test',
  sections: [
    {
      title: 'Using AmazeCare',
      paragraphs: [
        'AmazeCare is a demonstration of a clinic appointment and records product. You may use it to explore the patient, doctor, and administrator experiences.',
        'You agree not to enter real medical information, attempt to disrupt the demo, or present the demo as a live clinical service.',
      ],
    },
    {
      title: 'Appointments',
      paragraphs: [
        'Appointments created in this demo are fictional and are stored only in your browser. No doctor, clinic, or hospital receives a booking request.',
        'Availability, confirmations, cancellations, and reminders are simulated to show the intended workflow.',
      ],
    },
    {
      title: 'Clinical information',
      paragraphs: [
        'Consultation notes, prescriptions, test orders, and dosages are sample data for product evaluation. They are not medical advice and must not be used to diagnose or treat any person.',
        'Always seek the advice of a qualified clinician for a medical concern.',
      ],
    },
    {
      title: 'Accounts and access',
      paragraphs: [
        'Demo accounts are provided for evaluation. Do not reuse a real password. The demo keeps session and clinical data in browser storage, and anyone with access to this browser profile may be able to view it.',
      ],
    },
    {
      title: 'Billing',
      paragraphs: [
        'Invoices are sample documents. No payment is processed, no card details are collected, and no amount is owed. Printing or saving an invoice creates a local file for demonstration only.',
      ],
    },
    {
      title: 'Demo limits',
      paragraphs: [
        'The demo may change without notice. Some features, including secure chat and online payments, are outside the current scope. Data can be cleared by the browser or by the development team.',
      ],
    },
    {
      title: 'Availability',
      paragraphs: [
        'The demo is provided as is, without a service level commitment. AmazeCare does not guarantee that the demo will be available, complete, or free from errors.',
      ],
    },
    {
      title: 'Liability',
      paragraphs: [
        'To the extent permitted by law, AmazeCare is not liable for loss arising from use of this demonstration or from reliance on its sample clinical or billing content.',
      ],
    },
    {
      title: 'Changes to these terms',
      paragraphs: [
        'These terms may be updated as the product evolves. Continued use of the demo after an update means you accept the revised terms.',
      ],
    },
  ],
}

export function PrivacyPage() {
  useDocumentMeta({
    title: 'Privacy notice | AmazeCare',
    description:
      'How the AmazeCare demonstration stores and uses appointment and profile information.',
  })
  return <LegalShell content={privacy} />
}

export function TermsPage() {
  useDocumentMeta({
    title: 'Terms of use | AmazeCare',
    description:
      'The rules and limits for using the AmazeCare demonstration.',
  })
  return <LegalShell content={terms} />
}
