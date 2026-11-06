import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarBlank,
  ChartBar,
  Plus,
  Receipt,
  Stethoscope,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import { formatCurrency, pluralize } from '../../lib/format'
import {
  addDaysISO,
  formatDateShort,
  formatDayNumber,
  formatTime,
  formatWeekday,
  getNextDays,
  todayISO,
} from '../../lib/date'
import { getInvoiceTotals } from '../../lib/invoice'
import { getUpcomingAppointments } from '../../lib/selectors'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function AdminDashboard() {
  useDocumentMeta({
    title: 'Overview | AmazeCare Admin',
    description: 'The clinic week, pending requests, and billing health.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()

  const appointments = clinic.state.appointments
  const upcoming = getUpcomingAppointments(appointments)
  const pending = upcoming.filter(
    (appointment) => appointment.status === 'pending',
  )
  const weekDays = getNextDays(7)
  const weekEnd = addDaysISO(6)
  const weekVisits = upcoming.filter(
    (appointment) =>
      appointment.date >= todayISO() && appointment.date <= weekEnd,
  )
  const weekDoctors = new Set(
    weekVisits.map((appointment) => appointment.doctorId),
  ).size
  const weekDepartments = new Set(
    weekVisits.map((appointment) => {
      const doctor = clinic.getDoctor(appointment.doctorId)
      return doctor?.specializationId ?? ''
    }),
  ).size
  const dayCounts = weekDays.map(
    (date) => weekVisits.filter((appointment) => appointment.date === date).length,
  )
  const maxDayCount = Math.max(1, ...dayCounts)
  const nextClinicDate = weekVisits[0]?.date
  const nextClinicCount = nextClinicDate
    ? weekVisits.filter((appointment) => appointment.date === nextClinicDate)
        .length
    : 0

  const invoices = clinic.state.invoices
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid')
  const issuedInvoices = invoices.filter((invoice) => invoice.status === 'issued')
  const collected = paidInvoices.reduce(
    (sum, invoice) => sum + getInvoiceTotals(invoice).total,
    0,
  )
  const outstanding = issuedInvoices.reduce(
    (sum, invoice) => sum + getInvoiceTotals(invoice).total,
    0,
  )
  const billingTotal = collected + outstanding
  const collectionRate =
    billingTotal > 0 ? Math.round((collected / billingTotal) * 100) : 0

  const stats = [
    {
      label: 'Upcoming visits',
      value: upcoming.length,
      hint: 'Requests and confirmed',
    },
    {
      label: 'Pending requests',
      value: pending.length,
      hint: pending.length > 0 ? 'Need a decision' : 'All clear',
    },
    {
      label: 'Invoices',
      value: invoices.length,
      hint: `${issuedInvoices.length} awaiting payment`,
    },
    {
      label: 'Collected',
      value: formatCurrency(collected),
      hint: `${collectionRate}% of billed value`,
    },
  ]

  const agenda = upcoming.slice(0, 8)
  const attentionPending = pending.slice(0, 2)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? 'there'}.`}
        description="The clinic week, from appointment requests to billing health."
        actions={
          <Link
            to="/admin/appointments"
            className={buttonStyles({ variant: 'secondary' })}
          >
            Manage appointments
          </Link>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-mint">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_340px] lg:items-center">
          <div className="flex flex-col gap-3">
            <p className="caption-4 text-ink/60">The week ahead</p>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="heading-1 text-ink">{weekVisits.length}</p>
              <p className="pb-1 title-2 text-ink/75">
                {pluralize(weekVisits.length, 'visit')} in the next seven days
              </p>
            </div>
            <p className="max-w-xl body-5 text-ink/70">
              {weekDoctors} {pluralize(weekDoctors, 'doctor')} booked across{' '}
              {weekDepartments} {pluralize(weekDepartments, 'department')}.{' '}
              {pending.length} {pluralize(pending.length, 'request')} still need
              a decision.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span className="caption-5 text-ink/60">
                  {nextClinicDate
                    ? `Next clinic day ${formatDateShort(nextClinicDate)}`
                    : 'No clinic day booked'}
                </span>
              </div>
              {nextClinicDate ? (
                <span className="caption-5 text-ink/60">
                  {nextClinicCount} {pluralize(nextClinicCount, 'visit')}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className="grid grid-cols-7 gap-1.5 rounded-xl border border-primary/15 bg-surface/60 p-3"
            role="img"
            aria-label={`Visits in the next seven days: ${weekDays
              .map(
                (date, index) =>
                  `${formatWeekday(date)} ${formatDayNumber(date)}, ${dayCounts[index]}`,
              )
              .join('. ')}`}
          >
            {weekDays.map((date, index) => {
              const count = dayCounts[index]
              const height = count === 0 ? 6 : 18 + (count / maxDayCount) * 56
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <span className="caption-5 text-ink/50">
                    {formatWeekday(date)}
                  </span>
                  <span className="font-mono text-xs font-medium text-ink">
                    {formatDayNumber(date)}
                  </span>
                  <div className="flex h-20 w-full items-end justify-center">
                    <span
                      className={
                        count === 0
                          ? 'w-full rounded-t-sm bg-primary/15'
                          : 'w-full rounded-t-sm bg-primary'
                      }
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-ink/60">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 bg-surface p-4">
            <dt className="caption-5 text-muted">{stat.label}</dt>
            <dd className="heading-5 text-ink">{stat.value}</dd>
            <p className="caption-5 text-muted">{stat.hint}</p>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="heading-5 text-ink">Upcoming appointments</h2>
              <p className="mt-1 caption-5 text-muted">
                The next {agenda.length} {pluralize(agenda.length, 'visit')} across
                all departments.
              </p>
            </div>
            <Link
              to="/admin/appointments"
              className="link inline-flex items-center gap-1 text-sm"
            >
              All appointments
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {agenda.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {agenda.map((appointment) => {
                const patient = clinic.getPatient(appointment.patientId)
                const doctor = clinic.getDoctor(appointment.doctorId)
                if (!patient || !doctor) return null
                return (
                  <li
                    key={appointment.id}
                    className="border-t border-line first:border-t-0"
                  >
                    <Link
                      to={`/admin/appointments/${appointment.id}`}
                      className="flex flex-col gap-3 p-4 transition-colors hover:bg-paper sm:flex-row sm:items-center sm:p-5"
                    >
                      <div className="flex w-24 shrink-0 flex-col">
                        <span className="font-mono text-sm font-medium text-ink">
                          {formatTime(appointment.time)}
                        </span>
                        <span className="caption-5 text-muted">
                          {formatDateShort(appointment.date)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="body-5 truncate text-ink">{patient.name}</p>
                        <p className="caption-5 text-muted">
                          {doctor.name}. {appointment.natureOfVisit}.
                        </p>
                      </div>
                      <StatusChip status={appointment.status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
              title="No upcoming appointments"
              description="New requests and confirmed visits will appear here."
            />
          )}

          <section className="flex flex-col gap-4 pt-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="heading-5 text-ink">Billing health</h2>
                <p className="mt-1 caption-5 text-muted">
                  Collected and outstanding value across all invoices.
                </p>
              </div>
              <Link to="/admin/reports" className="link text-sm">
                Open reports
              </Link>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="caption-5 text-muted">Collected</p>
                  <p className="font-mono text-2xl font-medium text-ink">
                    {formatCurrency(collected)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="caption-5 text-muted">Outstanding</p>
                  <p className="font-mono text-xl font-medium text-coral">
                    {formatCurrency(outstanding)}
                  </p>
                </div>
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-paper"
                role="img"
                aria-label={`${collectionRate} percent of billed value collected`}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 caption-5 text-muted">
                <span>{collectionRate}% collected</span>
                <span>{formatCurrency(billingTotal)} billed</span>
              </div>
            </div>
          </section>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <WarningCircle
                className="h-5 w-5 text-coral"
                aria-hidden="true"
              />
              <h2 className="title-1 text-ink">Needs attention</h2>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="rounded-lg bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="body-5 text-ink">
                    {pending.length} pending{' '}
                    {pluralize(pending.length, 'request')}
                  </p>
                  <Link to="/admin/appointments" className="link text-sm">
                    Review
                  </Link>
                </div>
                {attentionPending.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {attentionPending.map((appointment) => {
                      const patient = clinic.getPatient(appointment.patientId)
                      if (!patient) return null
                      return (
                        <li
                          key={appointment.id}
                          className="flex items-center justify-between gap-2 caption-5 text-muted"
                        >
                          <span className="truncate">{patient.name}</span>
                          <span className="shrink-0 font-mono">
                            {formatDateShort(appointment.date)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>

              <div className="rounded-lg bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="body-5 text-ink">
                    {issuedInvoices.length} unpaid{' '}
                    {pluralize(issuedInvoices.length, 'invoice')}
                  </p>
                  <Link to="/admin/invoices" className="link text-sm">
                    Open
                  </Link>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {formatCurrency(outstanding)} outstanding
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Quick actions</h2>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/admin/doctors/new"
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-paper"
              >
                <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex-1 body-6 text-ink">Add a doctor</span>
                <Plus className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              </Link>
              <Link
                to="/admin/patients"
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-paper"
              >
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex-1 body-6 text-ink">Register a patient</span>
                <Plus className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              </Link>
              <Link
                to="/admin/catalog"
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-paper"
              >
                <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex-1 body-6 text-ink">Manage catalog</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              </Link>
              <Link
                to="/admin/reports"
                className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-paper"
              >
                <ChartBar className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex-1 body-6 text-ink">View reports</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">At a glance</h2>
            <dl className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Doctors</dt>
                <dd className="body-5 text-ink">{clinic.state.doctors.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Patients</dt>
                <dd className="body-5 text-ink">{clinic.state.patients.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Departments</dt>
                <dd className="body-5 text-ink">
                  {clinic.state.specializations.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="body-6 text-muted">Catalog items</dt>
                <dd className="body-5 text-ink">
                  {clinic.state.medicines.length + clinic.state.tests.length}
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line pt-3 caption-5 text-muted">
              Week starting {formatDateShort(weekDays[0])}. Next month view is on
              the reports page.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
