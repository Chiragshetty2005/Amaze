import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  DownloadSimple,
  EnvelopeSimple,
  Printer,
  Receipt,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { InvoiceStatusChip } from '../../components/ui/StatusChip'
import { Button, buttonStyles } from '../../components/ui/Button'
import { InvoiceSlip } from '../../components/app/InvoiceSlip'
import { apiErrorMessage } from '../../lib/api'
import { formatDateShort } from '../../lib/date'

export function AdminInvoiceDetailPage() {
  useDocumentMeta({
    title: 'Invoice | AmazeCare Admin',
    description: 'Review, print, and settle a clinic invoice.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const clinic = useClinic()
  const invoice = clinic.state.invoices.find((item) => item.id === id)
  const patient = invoice ? clinic.getPatient(invoice.patientId) : undefined
  const doctor = invoice ? clinic.getDoctor(invoice.doctorId) : undefined
  const appointment = invoice
    ? clinic.state.appointments.find(
        (item) => item.id === invoice.appointmentId,
      )
    : undefined

  if (!invoice || !patient) {
    return (
      <EmptyState
        icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
        title="Invoice not found"
        description="This invoice may have been removed with its patient or appointment."
        action={
          <Link to="/admin/invoices" className={buttonStyles()}>
            Back to invoices
          </Link>
        }
      />
    )
  }

  const markPaid = async () => {
    try {
      await clinic.markInvoicePaid(invoice.id)
      toast.success('Invoice marked as paid.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const downloadPdf = async () => {
    try {
      await clinic.downloadInvoicePdf(invoice.id, invoice.invoiceNumber)
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const emailInvoice = async () => {
    try {
      const message = await clinic.emailInvoice(invoice.id)
      toast.success(message || 'Invoice emailed to the patient.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/invoices"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'issued' ? (
            <Button type="button" size="sm" onClick={() => void markPaid()}>
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Mark as paid
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void downloadPdf()}
          >
            <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void emailInvoice()}
          >
            <EnvelopeSimple className="h-4 w-4" aria-hidden="true" />
            Email invoice
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </Button>
        </div>
      </div>

      <PageHeader
        title="Invoice"
        description={`${patient.name}. Issued ${formatDateShort(
          invoice.issuedAt,
        )}.`}
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
