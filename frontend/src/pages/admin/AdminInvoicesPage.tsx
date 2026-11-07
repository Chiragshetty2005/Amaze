import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from '@phosphor-icons/react'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { InvoiceStatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { formatCurrency, pluralize } from '../../lib/format'
import { formatDateShort } from '../../lib/date'
import { getInvoiceTotals } from '../../lib/invoice'

export function AdminInvoicesPage() {
  useDocumentMeta({
    title: 'Invoices | AmazeCare Admin',
    description: 'Track issued and paid invoices across the clinic.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [tab, setTab] = useState<'all' | 'issued' | 'paid'>('all')
  const [query, setQuery] = useState('')

  const invoices = clinic.state.invoices
    .slice()
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const normalized = query.trim().toLowerCase()
  const filtered = invoices.filter((invoice) => {
    if (tab !== 'all' && invoice.status !== tab) return false
    if (!normalized) return true
    const patient = clinic.getPatient(invoice.patientId)
    const doctor = clinic.getDoctor(invoice.doctorId)
    return [
      invoice.invoiceNumber,
      patient?.name ?? '',
      doctor?.name ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  })

  const issued = invoices.filter((invoice) => invoice.status === 'issued')
  const paid = invoices.filter((invoice) => invoice.status === 'paid')
  const billed = invoices.reduce(
    (sum, invoice) => sum + getInvoiceTotals(invoice).total,
    0,
  )
  const collected = paid.reduce(
    (sum, invoice) => sum + getInvoiceTotals(invoice).total,
    0,
  )
  const outstanding = issued.reduce(
    (sum, invoice) => sum + getInvoiceTotals(invoice).total,
    0,
  )

  const counts = {
    all: invoices.length,
    issued: issued.length,
    paid: paid.length,
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invoices"
        description={`${invoices.length} ${pluralize(
          invoices.length,
          'invoice',
        )} across completed consultations.`}
        actions={
          <Link
            to="/admin/reports"
            className={buttonStyles({ variant: 'secondary' })}
          >
            Open reports
          </Link>
        }
      />

      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Billed</dt>
          <dd className="font-mono text-xl font-medium text-ink">
            {formatCurrency(billed)}
          </dd>
          <dd className="caption-5 text-muted">
            {invoices.length} {pluralize(invoices.length, 'invoice')}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Collected</dt>
          <dd className="font-mono text-xl font-medium text-primary">
            {formatCurrency(collected)}
          </dd>
          <dd className="caption-5 text-muted">
            {paid.length} paid {pluralize(paid.length, 'invoice')}
          </dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Outstanding</dt>
          <dd className="font-mono text-xl font-medium text-danger">
            {formatCurrency(outstanding)}
          </dd>
          <dd className="caption-5 text-muted">
            {issued.length} awaiting payment
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search invoice or patient"
          ariaLabel="Search invoices"
          className="sm:max-w-md"
        />
        <Tabs
          value={tab}
          onValueChange={(value) =>
            setTab(value as 'all' | 'issued' | 'paid')
          }
          mode="filter"
        >
          <TabsList ariaLabel="Filter invoices">
            {(['all', 'issued', 'paid'] as const).map((value) => (
              <TabsTrigger key={value} value={value}>
                {value === 'all' ? 'All' : value === 'issued' ? 'Issued' : 'Paid'}{' '}
                <span className="ml-1 caption-5 text-muted">
                  {counts[value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
          title={invoices.length === 0 ? 'No invoices yet' : 'No invoice matches'}
          description={
            invoices.length === 0
              ? 'Invoices are created when a doctor finalizes a consultation.'
              : 'Try a different invoice number, patient, doctor, or status.'
          }
        />
      ) : (
        <div
          className="table-wrap"
          role="region"
          aria-label="Invoices"
          tabIndex={0}
        >
          <table className="table min-w-[920px]">
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Patient</th>
                <th scope="col">Doctor</th>
                <th scope="col">Issued</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => {
                const patient = clinic.getPatient(invoice.patientId)
                const doctor = clinic.getDoctor(invoice.doctorId)
                return (
                  <tr key={invoice.id}>
                    <td className="font-mono text-xs text-ink">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="font-medium text-ink">
                      {patient?.name ?? 'Removed patient'}
                    </td>
                    <td>{doctor?.name ?? 'Removed doctor'}</td>
                    <td>{formatDateShort(invoice.issuedAt)}</td>
                    <td className="font-mono">
                      {formatCurrency(getInvoiceTotals(invoice).total)}
                    </td>
                    <td>
                      <InvoiceStatusChip status={invoice.status} />
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <Link
                          to={`/admin/invoices/${invoice.id}`}
                          className={buttonStyles({
                            variant: 'secondary',
                            size: 'sm',
                          })}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption-5 text-muted" aria-live="polite">
        {filtered.length} {pluralize(filtered.length, 'invoice')} shown. Payment
        is recorded at the clinic; online payment is out of scope.
      </p>
    </div>
  )
}
