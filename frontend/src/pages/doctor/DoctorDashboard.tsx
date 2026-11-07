import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarBlank,
  CalendarX,
  Clock,
  Stethoscope,
  Users,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import { getAge, pluralize } from '../../lib/format'
import {
  formatDateShort,
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
  todayISO,
} from '../../lib/date'
import { getUpcomingAppointments } from '../../lib/selectors'
import { formatAvailabilitySummary } from '../../lib/availability'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DoctorDashboard() {
  useDocumentMeta({
    title: 'Overview | AmazeCare Doctor',
    description: 'Your next clinic day, pending requests, and recent consultations.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()
  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)

  if (!doctor) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="Doctor profile not found"
        description="The doctor record for this sign in could not be found."
      />
    )
  }

  const appointments = clinic.getDoctorAppointments(doctor.id)
  const upcoming = getUpcomingAppointments(appointments)
  const next = upcoming[0]
  const nextClinicDate = next?.date
  const clinicDay = nextClinicDate
    ? upcoming.filter((appointment) => appointment.date === nextClinicDate)
    : []
  const pending = appointments.filter(
    (appointment) =>
      appointment.status === 'pending' && appointment.date >= todayISO(),
  )
  const completed = appointments.filter(
    (appointment) => appointment.status === 'completed',
  )
  const activePatients = new Set(
    appointments.map((appointment) => appointment.patientId),
  ).size

  const appointmentIds = new Set(appointments.map((appointment) => appointment.id))
  const recentConsultations = clinic.state.consultations
    .filter((consultation) => appointmentIds.has(consultation.appointmentId))
    .flatMap((consultation) => {
      const appointment = appointments.find(
        (item) => item.id === consultation.appointmentId,
      )
      return appointment ? [{ consultation, appointment }] : []
    })
    .sort((a, b) =>
      b.consultation.createdAt.localeCompare(a.consultation.createdAt),
    )
    .slice(0, 3)

  const nextPatient = next
    ? clinic.getPatient(next.patientId)
    : undefined

  const stats = [
    {
      label: 'Next clinic day',
      value: nextClinicDate ? formatDateShort(nextClinicDate) : 'Not set',
    },
    { label: 'Visits booked', value: clinicDay.length },
    { label: 'Pending requests', value: pending.length },
    { label: 'Active patients', value: activePatients },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting()}, ${doctor.name}.`}
        description={
          clinicDay.length > 0
            ? `${clinicDay.length} ${pluralize(
                clinicDay.length,
                'patient is',
                'patients are',
              )} booked for your next clinic day.`
            : 'Your schedule and patient records are below.'
        }
        actions={
          <Link
            to="/doctor/appointments"
            className={buttonStyles({ variant: 'secondary' })}
          >
            Full schedule
          </Link>
        }
      />

      {next && nextPatient ? (
        <section className="overflow-hidden rounded-2xl border border-primary/20 bg-mint">
          <div className="grid sm:grid-cols-[1fr_190px]">
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="caption-4 text-ink/70">Next patient</p>
                <StatusChip status={next.status} />
              </div>

              <div className="flex items-start gap-4">
                <Avatar name={nextPatient.name} size="lg" />
                <div>
                  <h2 className="heading-5 text-ink">{nextPatient.name}</h2>
                  <p className="body-5 text-ink/70">
                    {getAge(nextPatient.dob)} years. {nextPatient.gender}.{' '}
                    {nextPatient.phone}
                  </p>
                  <p className="mt-1 caption-5 text-ink/70">
                    {next.natureOfVisit}
                  </p>
                </div>
              </div>

              <p className="line-clamp-2 body-6 text-ink/70">{next.symptoms}</p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/doctor/appointments/${next.id}`}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  View appointment
                </Link>
                {next.status === 'confirmed' ? (
                  <Link
                    to={`/doctor/appointments/${next.id}/consult`}
                    className={buttonStyles({ size: 'sm' })}
                  >
                    Start consultation
                  </Link>
                ) : (
                  <Link
                    to={`/doctor/appointments/${next.id}`}
                    className={buttonStyles({ size: 'sm' })}
                  >
                    Review request
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 border-t border-dashed border-primary/25 bg-surface/60 p-5 sm:border-l sm:border-t-0">
              <p className="caption-4 text-ink/70">
                {formatWeekday(next.date)}
              </p>
              <p className="heading-2 text-ink">{formatDayNumber(next.date)}</p>
              <p className="title-3 text-ink/70">{formatMonthShort(next.date)}</p>
              <p className="mt-2 flex items-center gap-1 font-mono text-lg font-medium text-ink">
                <Clock className="h-4 w-4 text-ink/70" aria-hidden="true" />
                {formatTime(next.time)}
              </p>
              <p className="mt-3 caption-5 text-center text-ink/70">
                Room 4, AmazeCare Clinic
              </p>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
          title="No upcoming appointments"
          description="New requests and confirmed visits will appear here once patients book."
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
        <section className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="heading-5 text-ink">
                {nextClinicDate
                  ? `${formatDateShort(nextClinicDate)} clinic`
                  : 'Upcoming clinic'}
              </h2>
              <p className="caption-5 text-muted">
                {clinicDay.length} {pluralize(clinicDay.length, 'visit')} booked
              </p>
            </div>
            <Link
              to="/doctor/appointments"
              className="link inline-flex items-center gap-1 text-sm"
            >
              Manage schedule
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {clinicDay.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {clinicDay.map((appointment) => {
                const patient = clinic.getPatient(appointment.patientId)
                if (!patient) return null
                return (
                  <li
                    key={appointment.id}
                    className="border-t border-line first:border-t-0"
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                      <div className="flex w-20 shrink-0 flex-col items-center rounded-lg bg-paper py-2">
                        <span className="whitespace-nowrap font-mono text-sm font-medium text-ink">
                          {formatTime(appointment.time)}
                        </span>
                        <span className="caption-5 text-muted">
                          {appointment.date === todayISO() ? 'Today' : 'Visit'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="title-2 truncate text-ink">{patient.name}</p>
                        <p className="caption-5 text-muted">
                          {getAge(patient.dob)} years. {patient.gender}.{' '}
                          {appointment.natureOfVisit}
                        </p>
                        <p className="mt-1 line-clamp-1 body-6 text-muted">
                          {appointment.symptoms}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <StatusChip status={appointment.status} />
                        <Link
                          to={`/doctor/appointments/${appointment.id}`}
                          className="link text-sm"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="body-6 text-muted">
                No visits are booked for this clinic day.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-end justify-between gap-3">
              <h2 className="heading-5 text-ink">Recent consultations</h2>
              <Link to="/doctor/patients" className="link text-sm">
                All patients
              </Link>
            </div>
            {recentConsultations.length > 0 ? (
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {recentConsultations.map(({ consultation, appointment }) => {
                  const patient = clinic.getPatient(appointment.patientId)
                  if (!patient) return null
                  return (
                    <li
                      key={consultation.id}
                      className="border-t border-line first:border-t-0"
                    >
                      <Link
                        to={`/doctor/appointments/${appointment.id}`}
                        className="flex items-center gap-4 p-4 transition-colors hover:bg-paper"
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                          <Stethoscope
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="body-5 truncate text-ink">
                            {consultation.diagnosis}
                          </p>
                          <p className="caption-5 text-muted">
                            {patient.name}.{' '}
                            <span className="font-mono">
                              {formatDateShort(appointment.date)}
                            </span>
                          </p>
                        </div>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-muted"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="body-6 text-muted">
                  Completed consultations will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <CalendarBlank className="h-5 w-5 text-muted" aria-hidden="true" />
              <h2 className="title-1 text-ink">Pending requests</h2>
            </div>
            {pending.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {pending.map((appointment) => {
                  const patient = clinic.getPatient(appointment.patientId)
                  if (!patient) return null
                  return (
                    <li
                      key={appointment.id}
                      className="flex items-start justify-between gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="body-5 truncate text-ink">{patient.name}</p>
                        <p className="caption-5 text-muted">
                          <span className="font-mono">
                            {formatDateShort(appointment.date)}
                          </span>{' '}
                          at{' '}
                          <span className="font-mono">
                            {formatTime(appointment.time)}
                          </span>
                        </p>
                      </div>
                      <Link
                        to={`/doctor/appointments/${appointment.id}`}
                        className="link shrink-0 text-sm"
                      >
                        Review
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 body-6 text-muted">No requests waiting.</p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted" aria-hidden="true" />
              <h2 className="title-1 text-ink">Care load</h2>
            </div>
            <dl className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Active patients</dt>
                <dd className="body-1 text-ink">{activePatients}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Completed visits</dt>
                <dd className="body-1 text-ink">{completed.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Next clinic date</dt>
                <dd className="body-5 text-ink">
                  {nextClinicDate ? formatDateShort(nextClinicDate) : 'Not set'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Clinic hours</h2>
            <p className="mt-2 body-6 text-muted">
              {formatAvailabilitySummary(doctor.availability)}
            </p>
            <Link to="/doctor/profile" className="link mt-3 inline-flex text-sm">
              View profile
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
