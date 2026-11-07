import { Logo } from '../brand/Logo'
import { InvoiceStatusChip } from '../ui/StatusChip'
import { formatDateShort } from '../../lib/date'
import { formatCurrency, getAge } from '../../lib/format'
import { getInvoiceTotals } from '../../lib/invoice'
import type { Appointment, Doctor, Invoice, Patient } from '../../types'

export function InvoiceSlip({
  invoice,
  patient,
  doctor,
  appointment,
}: {
  invoice: Invoice
  patient: Patient
  doctor?: Doctor
  appointment?: Appointment
}) {
  const totals = getInvoiceTotals(invoice)

  return (
    <article className="slip invoice-print mx-auto w-full max-w-3xl">
      <div className="slip-inner flex flex-col gap-6 p-5 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="caption-5 text-muted">
              AmazeCare Clinic, 4th Floor, 12th Main Road
              <br />
              Indiranagar, Bengaluru 560038
            </p>
          </div>
          <div className="text-right">
            <p className="caption-4 text-muted">Invoice</p>
            <p className="font-mono text-sm font-medium text-ink">
              {invoice.invoiceNumber}
            </p>
            <p className="mt-2 caption-5 text-muted">
              Issued {formatDateShort(invoice.issuedAt)}
            </p>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="caption-5 text-muted">Billed to</p>
            <p className="mt-1 title-2 text-ink">{patient.name}</p>
            <p className="caption-5 text-muted">
              {getAge(patient.dob)} years. {patient.phone}
            </p>
            <p className="caption-5 text-muted">{patient.email}</p>
            <p className="mt-1 caption-5 text-muted">{patient.address}</p>
          </div>
          <div className="sm:text-right">
            <p className="caption-5 text-muted">Consultation with</p>
            <p className="mt-1 title-2 text-ink">
              {doctor?.name ?? 'AmazeCare'}
            </p>
            <p className="caption-5 text-muted">{doctor?.qualification ?? ''}</p>
            {appointment ? (
              <p className="mt-1 caption-5 text-muted">
                Visit on{' '}
                <span className="font-mono">
                  {formatDateShort(appointment.date)}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="table-wrap"
          role="region"
          aria-label="Invoice line items"
          tabIndex={0}
        >
          <table className="table min-w-[520px]">
            <thead>
              <tr>
                <th scope="col">Description</th>
                <th scope="col" className="text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={`${item.description}-${item.amount}`}>
                  <td>{item.description}</td>
                  <td className="text-right font-mono">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto flex w-full max-w-xs flex-col gap-2">
          <div className="flex items-center justify-between gap-3 body-6 text-muted">
            <span>Subtotal</span>
            <span className="font-mono text-ink">
              {formatCurrency(totals.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 body-6 text-muted">
            <span>Tax at {Math.round(invoice.taxRate * 100)}%</span>
            <span className="font-mono text-ink">
              {formatCurrency(totals.tax)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
            <span className="title-2 text-ink">Total</span>
            <span className="font-mono text-xl font-medium text-ink">
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="caption-4 text-muted">Payment status</p>
            <InvoiceStatusChip status={invoice.status} />
          </div>
          <p className="caption-5 text-muted">
            {invoice.status === 'paid'
              ? 'Paid at the clinic. Thank you.'
              : 'Payment is due at the clinic. Online payment is not enabled in this demo.'}
          </p>
          <p className="mt-2 caption-5 text-muted">
            This invoice was generated for the AmazeCare workflow demo. No real
            payment is processed.
          </p>
        </div>
      </div>
    </article>
  )
}
