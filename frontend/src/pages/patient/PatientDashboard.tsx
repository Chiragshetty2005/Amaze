import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarBlank,
  CalendarX,
  FileText,
  Stethoscope,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip, InvoiceStatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import { formatCurrency, getAge, getDosageLabel, pluralize } from '../../lib/format'
import {
  formatDateShort,
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
} from '../../lib/date'
import { getInvoiceTotals } from '../../lib/invoice'
import {
  getPastAppointments,
  getUpcomingAppointments,
} from '../../lib/selectors'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function PatientDashboard() {
  useDocumentMeta({
    title: 'Overview | AmazeCare',
    description: 'Your next appointment, recent records, and open bills.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()
  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )

  if (!patient) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="Patient profile not found"
        description="Your sign in is active, but the patient record is missing. Sign out and try a demo account."
      />
    )
  }

  const appointments = clinic.getPatientAppointments(patient.id)
  const upcoming = getUpcomingAppointments(appointments)
  const next = upcoming[0]
  const alsoUpcoming = upcoming.filter((item) => item.id !== next?.id).slice(0, 3)
  const past = getPastAppointments(appointments)
  const records = clinic.state.consultations
    .filter((consultation) =>
      appointments.some(
        (appointment) => appointment.id === consultation.appointmentId,
      ),
    )
    .map((consultation) => ({
      consultation,
      appointment: appointments.find(
        (appointment) => appointment.id === consultation.appointmentId,
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        consultation: (typeof clinic.state.consultations)[number]
        appointment: (typeof appointments)[number]
      } => Boolean(item.appointment),
    )
    .sort((a, b) =>
      b.consultation.createdAt.localeCompare(a.consultation.createdAt),
    )

  const latestRecord = records[0]
  const testsOrdered = new Set(
    records.flatMap((item) => item.consultation.testIds),
  ).size

  const invoices = clinic.state.invoices
    .filter((invoice) => invoice.patientId === patient.id)
    .slice()
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const openBills = invoices.filter((invoice) => invoice.status === 'issued')
  const latestInvoice = invoices[0]

  const careTeamIds = Array.from(
    new Set(appointments.map((appointment) => appointment.doctorId)),
  )
  const careTeam = careTeamIds
    .map((id) => clinic.getDoctor(id))
    .filter((doctor): doctor is NonNullable<typeof doctor> => Boolean(doctor))
    .slice(0, 3)

  const nextDoctor = next ? clinic.getDoctor(next.doctorId) : undefined
  const nextSpecialization = nextDoctor
    ? clinic.getSpecialization(nextDoctor.specializationId)
    : undefined

  const stats = [
    { label: 'Upcoming visits', value: upcoming.length },
    { label: 'Records', value: records.length },
    { label: 'Tests ordered', value: testsOrdered },
    { label: 'Open bills', value: openBills.length },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting()}, ${patient.name.split(' ')[0]}.`}
        description="Your next visit, records, and bills in one place."
      />

      {next && nextDoctor ? (
        <section className="overflow-hidden rounded-2xl border border-primary/20 bg-mint">
          <div className="grid sm:grid-cols-[1fr_200px]">
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="caption-4 text-ink/60">Next appointment</p>
                <StatusChip status={next.status} />
              </div>

              <div className="flex items-start gap-4">
                <Avatar name={nextDoctor.name} size="lg" />
                <div className="min-w-0">
                  <h2 className="heading-5 text-ink">{nextDoctor.name}</h2>
                  <p className="body-5 text-ink/70">
                    {nextSpecialization?.name ?? nextDoctor.designation}
                  </p>
                  <p className="mt-1 caption-5 text-ink/60">
                    {next.natureOfVisit}
                  </p>
                </div>
              </div>

              <p className="line-clamp-2 body-6 text-ink/70">{next.symptoms}</p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/patient/appointments/${next.id}`}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  View appointment
                </Link>
                <Link
                  to={`/patient/appointments/${next.id}?reschedule=1`}
                  className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                >
                  Reschedule
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 border-t border-dashed border-primary/25 bg-surface/60 p-5 sm:border-l sm:border-t-0">
              <p className="caption-4 text-ink/60">
                {formatWeekday(next.date)}
              </p>
              <p className="heading-2 text-ink">{formatDayNumber(next.date)}</p>
              <p className="title-3 text-ink/70">
                {formatMonthShort(next.date)}
              </p>
              <p className="mt-2 font-mono text-lg font-medium text-ink">
                {formatTime(next.time)}
              </p>
              <p className="mt-3 caption-5 text-center text-ink/60">
                AmazeCare, Indiranagar
              </p>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
          title="No appointment on the calendar"
          description="Find a specialist, pick a live slot, and your visit will appear here."
          action={
            <Link to="/patient/doctors" className={buttonStyles()}>
              Find a doctor
            </Link>
          }
        />
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 bg-surface p-4">
            <dt className="caption-5 text-muted">{stat.label}</dt>
            <dd className="heading-5 text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="heading-5 text-ink">Your schedule</h2>
                <p className="caption-5 text-muted">
                  {upcoming.length}{' '}
                  {pluralize(upcoming.length, 'visit')} ahead
                </p>
              </div>
              <Link
                to="/patient/appointments"
                className="link inline-flex items-center gap-1 text-sm"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {alsoUpcoming.length > 0 ? (
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {alsoUpcoming.map((appointment) => {
                  const doctor = clinic.getDoctor(appointment.doctorId)
                  const specialization = doctor
                    ? clinic.getSpecialization(doctor.specializationId)
                    : undefined
                  if (!doctor) return null
                  return (
                    <li
                      key={appointment.id}
                      className="border-t border-line first:border-t-0"
                    >
                      <Link
                        to={`/patient/appointments/${appointment.id}`}
                        className="flex items-center gap-4 p-4 transition-colors duration-300 ease-out-expo hover:bg-paper"
                      >
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-paper py-1">
                          <span className="caption-5 text-muted">
                            {formatWeekday(appointment.date)}
                          </span>
                          <span className="title-2 text-ink">
                            {formatDayNumber(appointment.date)}
                          </span>
                          <span className="caption-5 text-muted">
                            {formatMonthShort(appointment.date)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="title-3 truncate text-ink">
                            {doctor.name}
                          </p>
                          <p className="caption-5 text-muted">
                            {specialization?.name ?? doctor.designation}
                            {'. '}
                            <span className="font-mono">
                              {formatTime(appointment.time)}
                            </span>
                          </p>
                        </div>
                        <StatusChip status={appointment.status} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="body-6 text-muted">
                  No other appointments on the calendar.
                </p>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="heading-5 text-ink">Recent records</h2>
              <Link
                to="/patient/records"
                className="link inline-flex items-center gap-1 text-sm"
              >
                All records
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {latestRecord ? (
              <article className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="caption-5 text-muted">
                      Consultation on{' '}
                      {formatDateShort(latestRecord.appointment.date)}
                    </p>
                    <h3 className="title-1 text-ink">
                      {latestRecord.consultation.diagnosis}
                    </h3>
                  </div>
                  <Link
                    to={`/patient/records/${latestRecord.consultation.id}`}
                    className="link text-sm"
                  >
                    View record
                  </Link>
                </div>
                <p className="mt-2 line-clamp-2 body-6 text-muted">
                  {latestRecord.consultation.treatmentPlan}
                </p>

                {latestRecord.consultation.prescription.length > 0 ? (
                  <div className="mt-4 rounded-lg bg-paper p-3">
                    <p className="caption-4 text-muted">Current prescription</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {latestRecord.consultation.prescription
                        .slice(0, 3)
                        .map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 body-6 text-ink"
                          >
                            <span>{item.medicineName}</span>
                            <span className="font-mono text-xs text-muted">
                              {getDosageLabel(
                                item.morning,
                                item.afternoon,
                                item.night,
                                item.foodRelation,
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ) : (
              <EmptyState
                icon={<FileText className="h-6 w-6" aria-hidden="true" />}
                title="No records yet"
                description="After a completed consultation, your notes, tests, and prescription will appear here."
              />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="card-flat flex flex-col gap-3">
            <p className="title-1 text-ink">Need care sooner?</p>
            <p className="body-6 text-ink/70">
              Search live availability across all eight departments and book a
              slot that works today.
            </p>
            <Link
              to="/patient/doctors"
              className="link inline-flex items-center gap-1 text-sm"
            >
              Find a doctor
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-1 text-ink">Latest bill</h2>
              <Link to="/patient/bills" className="link text-sm">
                All bills
              </Link>
            </div>
            {latestInvoice ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-muted">
                    {latestInvoice.invoiceNumber}
                  </p>
                  <InvoiceStatusChip status={latestInvoice.status} />
                </div>
                <p className="font-mono text-2xl font-medium text-ink">
                  {formatCurrency(getInvoiceTotals(latestInvoice).total)}
                </p>
                <p className="caption-5 text-muted">
                  Issued {formatDateShort(latestInvoice.issuedAt)}
                </p>
              </div>
            ) : (
              <p className="mt-3 body-6 text-muted">No bills yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Your care team</h2>
            {careTeam.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {careTeam.map((doctor) => {
                  const specialization = clinic.getSpecialization(
                    doctor.specializationId,
                  )
                  return (
                    <li
                      key={doctor.id}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={doctor.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="body-5 truncate text-ink">{doctor.name}</p>
                        <p className="caption-5 truncate text-muted">
                          {specialization?.name ?? doctor.designation}
                        </p>
                      </div>
                      <Link
                        to={`/patient/doctors?specialty=${doctor.specializationId}`}
                        className="link text-xs"
                      >
                        Book
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 body-6 text-muted">
                Your care team appears after your first visit.
              </p>
            )}
          </section>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-muted">
                <CalendarBlank className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="title-3 text-ink">
                  {past.length > 0
                    ? `${past.length} past ${pluralize(past.length, 'visit')}`
                    : 'Your visit history'}
                </p>
                <p className="caption-5 text-muted">
                  {getAge(patient.dob)} years. Patient ID{' '}
                  <span className="font-mono">{patient.id.toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
