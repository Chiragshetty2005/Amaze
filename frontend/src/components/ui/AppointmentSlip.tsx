import type { ReactNode } from 'react'
import { CalendarBlank, Clock, Phone } from '@phosphor-icons/react'
import type {
  Appointment,
  Doctor,
  Patient,
  Specialization,
} from '../../types'
import { formatDateShort, formatTime } from '../../lib/date'
import { Stethoscope, WarningCircle } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { StatusChip } from './StatusChip'
import { cn } from '../../lib/cn'

interface AppointmentSlipProps {
  appointment: Appointment
  doctor: Doctor
  patient: Patient
  specialization?: Specialization
  perspective: 'patient' | 'doctor'
  actions?: ReactNode
  className?: string
  compact?: boolean
}

export function AppointmentSlip({
  appointment,
  doctor,
  patient,
  specialization,
  perspective,
  actions,
  className,
  compact = false,
}: AppointmentSlipProps) {
  const person = perspective === 'patient' ? doctor : patient
  const subtitle =
    perspective === 'patient'
      ? (specialization?.name ?? doctor.designation)
      : `${patient.gender}, ${patient.phone}`

  return (
    <article className={cn('slip', className)}>
      <div className="slip-inner flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={person.name} size="md" />
            <div className="min-w-0">
              <p className="title-2 truncate text-ink">{person.name}</p>
              <p className="caption-2 truncate text-muted">{subtitle}</p>
            </div>
          </div>
          <StatusChip status={appointment.status} />
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-paper px-3 py-2">
          <span className="flex items-center gap-2 caption-1 text-ink">
            <CalendarBlank
              className="h-4 w-4 text-muted"
              aria-hidden="true"
            />
            {formatDateShort(appointment.date)}
          </span>
          <span className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
            <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
            {formatTime(appointment.time)}
          </span>
          {!compact && perspective === 'doctor' ? (
            <span className="flex items-center gap-2 caption-1 text-ink">
              <Phone className="h-4 w-4 text-muted" aria-hidden="true" />
              {patient.phone}
            </span>
          ) : null}
          {!compact && perspective === 'patient' ? (
            <span className="flex items-center gap-2 caption-1 text-ink">
              <Stethoscope
                className="h-4 w-4 text-muted"
                aria-hidden="true"
              />
              {doctor.designation}
            </span>
          ) : null}
        </div>

        {!compact && appointment.symptoms ? (
          <p className="flex items-start gap-2 body-6 text-muted">
            <WarningCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-muted"
              aria-hidden="true"
            />
            <span className="line-clamp-2">{appointment.symptoms}</span>
          </p>
        ) : null}

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </article>
  )
}
