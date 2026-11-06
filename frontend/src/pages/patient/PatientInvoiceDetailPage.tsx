import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Receipt } from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { InvoiceStatusChip } from '../../components/ui/StatusChip'
import { Button, buttonStyles } from '../../components/ui/Button'
import { InvoiceSlip } from '../../components/app/InvoiceSlip'
import { formatDateShort } from '../../lib/date'

export function PatientInvoiceDetailPage() {
  useDocumentMeta({
    title: 'Invoice | AmazeCare',
    description: 'Invoice details for a completed consultation.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const clinic = useClinic()

  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )
  const invoice = clinic.state.invoices.find((item) => item.id === id)
  const allowed = Boolean(patient) && invoice?.patientId === patient?.id

  if (!allowed || !invoice || !patient) {
    return (
      <EmptyState
        icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
        title="Invoice not found"
        description="This invoice does not belong to your account, or it may have been removed."
        action={
          <Link to="/patient/bills" className={buttonStyles()}>
            Back to bills
          </Link>
        }
      />
    )
  }

  const doctor = clinic.getDoctor(invoice.doctorId)
  const appointment = clinic.state.appointments.find(
    (item) => item.id === invoice.appointmentId,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/patient/bills"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to bills
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print or save as PDF
        </Button>
      </div>

      <PageHeader
        title="Invoice"
        description={`Issued ${formatDateShort(invoice.issuedAt)}.`}
        actions={<InvoiceStatusChip status={invoice.status} />}
      />

      <InvoiceSlip
        invoice={invoice}
        patient={patient}
        doctor={doctor}
        appointment={appointment}
      />
    </div>
  )
}
