import { useState } from 'react'
import { DownloadSimple, TrendUp } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { formatCurrency, pluralize, statusLabel } from '../../lib/format'
import { addDaysISO, formatDateShort, todayISO } from '../../lib/date'
import { getInvoiceTotals } from '../../lib/invoice'
import { cn } from '../../lib/cn'
import type { AppointmentStatus } from '../../types'

const statusColors: Record<AppointmentStatus, string> = {
  completed: 'bg-primary',
  confirmed: 'bg-primary/45',
  pending: 'bg-warning',
  cancelled: 'bg-muted/40',
  rejected: 'bg-coral',
}

const statusOrder: AppointmentStatus[] = [
  'completed',
  'confirmed',
  'pending',
  'cancelled',
  'rejected',
]

const periods = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const

export function AdminReportsPage() {
  useDocumentMeta({
    title: 'Reports | AmazeCare Admin',
    description: 'Revenue, visit, and doctor performance reports.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [periodDays, setPeriodDays] = useState<number>(30)
  const today = todayISO()
  const cutoff = addDaysISO(-(periodDays - 1))

  const invoicesInPeriod = clinic.state.invoices.filter((invoice) => {
    const issued = invoice.issuedAt.slice(0, 10)
    return issued >= cutoff && issued <= today
  })
  const appointmentsInPeriod = clinic.state.appointments.filter(
    (appointment) => appointment.date >= cutoff && appointment.date <= today,
  )
  const completedVisits = appointmentsInPeriod.filter(
    (appointment) => appointment.status === 'completed',
  )

  const billed = invoicesInPeriod.reduce(
    (sum, invoice) => sum + getInvoiceTotals(invoice).total,
    0,
  )
  const collected = invoicesInPeriod
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).total, 0)
  const outstanding = invoicesInPeriod
    .filter((invoice) => invoice.status === 'issued')
    .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).total, 0)
  const averageInvoice =
    invoicesInPeriod.length > 0 ? Math.round(billed / invoicesInPeriod.length) : 0

  const departmentMap = new Map<
    string,
    { name: string; amount: number; invoices: number }
  >()
  invoicesInPeriod.forEach((invoice) => {
    const doctor = clinic.getDoctor(invoice.doctorId)
    if (!doctor) return
    const specialization = clinic.getSpecialization(doctor.specializationId)
    const key = specialization?.id ?? 'unassigned'
    const current = departmentMap.get(key) ?? {
      name: specialization?.name ?? 'Unassigned',
      amount: 0,
      invoices: 0,
    }
    current.amount += getInvoiceTotals(invoice).total
    current.invoices += 1
    departmentMap.set(key, current)
  })
  const departmentRevenue = Array.from(departmentMap.values()).sort(
    (a, b) => b.amount - a.amount,
  )
  const departmentMax = Math.max(
    1,
    ...departmentRevenue.map((department) => department.amount),
  )

  const doctorStats = clinic.state.doctors
    .map((doctor) => {
      const visits = completedVisits.filter(
        (appointment) => appointment.doctorId === doctor.id,
      ).length
      const doctorInvoices = invoicesInPeriod.filter(
        (invoice) => invoice.doctorId === doctor.id,
      )
      const revenue = doctorInvoices.reduce(
        (sum, invoice) => sum + getInvoiceTotals(invoice).total,
        0,
      )
      const specialization = clinic.getSpecialization(doctor.specializationId)
      return {
        doctor,
        specialization,
        visits,
        revenue,
        average: doctorInvoices.length > 0 ? Math.round(revenue / doctorInvoices.length) : 0,
      }
    })
    .filter((row) => row.visits > 0 || row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits)

  const statusCounts = statusOrder.map((status) => ({
    status,
    count: appointmentsInPeriod.filter(
      (appointment) => appointment.status === status,
    ).length,
  }))
  const totalVisits = appointmentsInPeriod.length

  const exportCsv = () => {
    const rows: string[][] = [
      [
        'Invoice',
        'Issued',
        'Patient',
        'Doctor',
        'Department',
        'Status',
        'Subtotal',
        'Tax',
        'Total',
      ],
      ...invoicesInPeriod.map((invoice) => {
        const patient = clinic.getPatient(invoice.patientId)
        const doctor = clinic.getDoctor(invoice.doctorId)
        const specialization = doctor
          ? clinic.getSpecialization(doctor.specializationId)
          : undefined
        const totals = getInvoiceTotals(invoice)
        return [
          invoice.invoiceNumber,
          invoice.issuedAt.slice(0, 10),
          patient?.name ?? '',
          doctor?.name ?? '',
          specialization?.name ?? '',
          invoice.status,
          String(totals.subtotal),
          String(totals.tax),
          String(totals.total),
        ]
      }),
    ]
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `amazecare-invoices-${periodDays}d.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${invoicesInPeriod.length} invoices.`)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description={`Revenue and visit performance from ${formatDateShort(
          cutoff,
        )} to ${formatDateShort(today)}.`}
        actions={
          <Button type="button" variant="secondary" onClick={exportCsv}>
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg bg-paper p-1"
          role="group"
          aria-label="Report period"
        >
          {periods.map((period) => (
            <button
              key={period.value}
              type="button"
              onClick={() => setPeriodDays(period.value)}
              aria-pressed={periodDays === period.value}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-300 ease-out-expo',
                periodDays === period.value
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
            >
              {period.label}
            </button>
          ))}
        </div>
        <p className="caption-5 text-muted">
          {invoicesInPeriod.length} {pluralize(invoicesInPeriod.length, 'invoice')} and{' '}
          {appointmentsInPeriod.length} {pluralize(appointmentsInPeriod.length, 'visit')} in
          view.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Billed</dt>
          <dd className="font-mono text-xl font-medium text-ink">
            {formatCurrency(billed)}
          </dd>
          <p className="caption-5 text-muted">All invoices</p>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Collected</dt>
          <dd className="font-mono text-xl font-medium text-primary">
            {formatCurrency(collected)}
          </dd>
          <p className="caption-5 text-muted">
            {billed > 0 ? Math.round((collected / billed) * 100) : 0}% of billed
          </p>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Outstanding</dt>
          <dd className="font-mono text-xl font-medium text-coral">
            {formatCurrency(outstanding)}
          </dd>
          <p className="caption-5 text-muted">Awaiting payment</p>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Completed visits</dt>
          <dd className="heading-5 text-ink">{completedVisits.length}</dd>
          <p className="caption-5 text-muted">
            Average {formatCurrency(averageInvoice)} per invoice
          </p>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="title-1 text-ink">Revenue by department</h2>
              <p className="mt-1 body-6 text-muted">
                Billed value in the selected period.
              </p>
            </div>
            <TrendUp className="h-5 w-5 text-muted" aria-hidden="true" />
          </div>

          {departmentRevenue.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-4">
              {departmentRevenue.map((department) => {
                const percentage = Math.round(
                  (department.amount / billed) * 100,
                )
                return (
                  <li key={department.name} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="body-6 text-ink">{department.name}</p>
                      <p className="font-mono text-xs text-ink">
                        {formatCurrency(department.amount)}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-paper">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${
                            department.amount > 0
                              ? Math.max(
                                  4,
                                  (department.amount / departmentMax) * 100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 caption-5 text-muted">
                      <span>{percentage}% of billed value</span>
                      <span>
                        {department.invoices}{' '}
                        {pluralize(department.invoices, 'invoice')}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-5 body-6 text-muted">
              No invoices were issued in this period.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="title-1 text-ink">Visits by status</h2>
          <p className="mt-1 body-6 text-muted">
            Appointments dated within the selected period.
          </p>

          {totalVisits > 0 ? (
            <>
              <div
                className="mt-5 flex h-4 overflow-hidden rounded-full bg-paper"
                role="img"
                aria-label={statusCounts
                  .map((item) => `${statusLabel[item.status]}: ${item.count}`)
                  .join('. ')}
              >
                {statusCounts
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <span
                      key={item.status}
                      className={cn('h-full', statusColors[item.status])}
                      style={{ width: `${(item.count / totalVisits) * 100}%` }}
                    />
                  ))}
              </div>
              <ul className="mt-5 flex flex-col gap-3">
                {statusCounts.map((item) => (
                  <li
                    key={item.status}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 body-6 text-ink">
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          statusColors[item.status],
                        )}
                        aria-hidden="true"
                      />
                      {statusLabel[item.status]}
                    </span>
                    <span className="font-mono text-sm text-ink">
                      {item.count}{' '}
                      <span className="font-sans text-xs text-muted">
                        {totalVisits > 0
                          ? `${Math.round((item.count / totalVisits) * 100)}%`
                          : '0%'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-line pt-4 caption-5 text-muted">
                {completedVisits.length} completed{' '}
                {pluralize(completedVisits.length, 'visit')} in this period.
              </p>
            </>
          ) : (
            <p className="mt-5 body-6 text-muted">
              No appointments fall within this period.
            </p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="heading-5 text-ink">Doctor performance</h2>
          <p className="mt-1 caption-5 text-muted">
            Completed visits and billed revenue for the selected period.
          </p>
        </div>

        {doctorStats.length > 0 ? (
          <div className="table-wrap">
            <table className="table min-w-[760px]">
              <thead>
                <tr>
                  <th scope="col">Doctor</th>
                  <th scope="col">Department</th>
                  <th scope="col">Completed visits</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">Average invoice</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.map((row) => (
                  <tr key={row.doctor.id}>
                    <td>
                      <p className="font-medium text-ink">{row.doctor.name}</p>
                      <p className="caption-5 text-muted">
                        {row.doctor.designation}
                      </p>
                    </td>
                    <td>{row.specialization?.name ?? 'Unassigned'}</td>
                    <td className="font-mono">{row.visits}</td>
                    <td className="font-mono">{formatCurrency(row.revenue)}</td>
                    <td className="font-mono">{formatCurrency(row.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="body-6 text-muted">
              Doctor performance appears once completed visits and invoices exist
              in the selected period.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
