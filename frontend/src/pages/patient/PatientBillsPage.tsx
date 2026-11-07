import { Link } from 'react-router-dom'
import { Receipt } from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { InvoiceStatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import { formatDateShort } from '../../lib/date'
import { formatCurrency } from '../../lib/format'
import { getInvoiceTotals } from '../../lib/invoice'

export function PatientBillsPage() {
  useDocumentMeta({
    title: 'Bills | AmazeCare',
    description: 'Invoices for completed consultations and tests.',
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
        icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
        title="Bills are unavailable"
        description="The patient record for this sign in could not be found."
      />
    )
  }

  const invoices = clinic.state.invoices
    .filter((invoice) => invoice.patientId === patient.id)
    .slice()
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))

  const paidTotal = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).total, 0)
  const dueTotal = invoices
    .filter((invoice) => invoice.status === 'issued')
    .reduce((sum, invoice) => sum + getInvoiceTotals(invoice).total, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bills"
        description="Invoices for consultations, tests, and other clinic charges."
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Paid to date</dt>
          <dd className="heading-5 font-mono text-ink">
            {formatCurrency(paidTotal)}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Open balance</dt>
          <dd className="heading-5 font-mono text-ink">
            {formatCurrency(dueTotal)}
          </dd>
        </div>
        <div className="col-span-2 flex flex-col gap-1 bg-surface p-4 sm:col-span-1">
          <dt className="caption-5 text-muted">Invoices</dt>
          <dd className="heading-5 text-ink">{invoices.length}</dd>
        </div>
      </dl>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
          title="No bills yet"
          description="After a completed consultation, your invoice will appear here."
          action={
            <Link to="/patient/appointments" className={buttonStyles()}>
              View appointments
            </Link>
          }
        />
      ) : (
        <div
          className="table-wrap"
          role="region"
          aria-label="Bills"
          tabIndex={0}
        >
          <table className="table min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Issued</th>
                <th scope="col">Doctor</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const doctor = clinic.getDoctor(invoice.doctorId)
                const totals = getInvoiceTotals(invoice)
                return (
                  <tr key={invoice.id}>
                    <td className="font-mono text-xs">
                      {invoice.invoiceNumber}
                    </td>
                    <td>{formatDateShort(invoice.issuedAt)}</td>
                    <td>{doctor?.name ?? 'AmazeCare'}</td>
                    <td className="font-mono font-medium">
                      {formatCurrency(totals.total)}
                    </td>
                    <td>
                      <InvoiceStatusChip status={invoice.status} />
                    </td>
                    <td>
                      <Link
                        to={`/patient/bills/${invoice.id}`}
                        className="link text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption-5 text-muted">
        Payment happens at the clinic. Online payment is not enabled in this
        demo.
      </p>
    </div>
  )
}
