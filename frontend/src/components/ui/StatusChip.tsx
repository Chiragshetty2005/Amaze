import type { AppointmentStatus, InvoiceStatus } from '../../types'
import { invoiceStatusLabel, statusLabel } from '../../lib/format'
import { cn } from '../../lib/cn'

const statusClass: Record<AppointmentStatus, string> = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
  rejected: 'status-rejected',
}

export function StatusChip({
  status,
  className,
}: {
  status: AppointmentStatus
  className?: string
}) {
  return (
    <span className={cn('status-chip', statusClass[status], className)}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {statusLabel[status]}
    </span>
  )
}

export function InvoiceStatusChip({
  status,
  className,
}: {
  status: InvoiceStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'status-chip',
        status === 'paid' ? 'status-paid' : 'status-pending',
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {invoiceStatusLabel[status]}
    </span>
  )
}
