import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  EnvelopeSimple,
  FileText,
  MapPin,
  Phone,
  Receipt,
  Stethoscope,
  WarningCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Button, buttonStyles } from '../../components/ui/Button'
import { InvoiceStatusChip, StatusChip } from '../../components/ui/StatusChip'
import { SlotPicker } from '../../components/ui/SlotPicker'
import { TextAreaField } from '../../components/ui/Form'
import {
  formatDateLong,
  formatDateShort,
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
  getNextDays,
} from '../../lib/date'
import { formatCurrency, getAge, getDosageLabel } from '../../lib/format'
import { getInvoiceTotals } from '../../lib/invoice'
import { apiErrorMessage } from '../../lib/api'
import { isActiveAppointment } from '../../lib/selectors'

type ReasonMode = 'reject' | 'cancel'

export function AdminAppointmentDetailPage() {
  useDocumentMeta({
    title: 'Appointment | AmazeCare Admin',
    description: 'Review, confirm, move, or cancel a clinic appointment.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const clinic = useClinic()

  const appointment = clinic.state.appointments.find((item) => item.id === id)
  const patient = appointment
    ? clinic.getPatient(appointment.patientId)
    : undefined
  const doctor = appointment ? clinic.getDoctor(appointment.doctorId) : undefined
  const specialization = doctor
    ? clinic.getSpecialization(doctor.specializationId)
    : undefined
  const consultation = appointment
    ? clinic.getConsultationForAppointment(appointment.id)
    : undefined
  const invoice = appointment
    ? clinic.getInvoiceForAppointment(appointment.id)
    : undefined

  const dates = useMemo(() => getNextDays(14), [])
  const nextAvailable = useMemo(
    () => (doctor ? clinic.getNextAvailableSlot(doctor.id) : null),
    [doctor, clinic],
  )

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(
    nextAvailable?.date ?? dates[0],
  )
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [reasonMode, setReasonMode] = useState<ReasonMode | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  useEffect(() => {
    setRescheduleDate(nextAvailable?.date ?? dates[0])
    setRescheduleTime('')
  }, [appointment?.id, dates, nextAvailable])

  const availableDates = useMemo(() => {
    const set = new Set<string>()
    if (!doctor) return set
    dates.forEach((date) => {
      if (clinic.getAvailableSlotsForDoctor(doctor.id, date).length > 0) {
        set.add(date)
      }
    })
    return set
  }, [doctor, dates, clinic])

  const rescheduleSlots = useMemo(
    () =>
      doctor ? clinic.getAvailableSlotsForDoctor(doctor.id, rescheduleDate) : [],
    [doctor, rescheduleDate, clinic],
  )

  if (!appointment || !patient || !doctor) {
    return (
      <EmptyState
        icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
        title="Appointment not found"
        description="This appointment may have been removed with its doctor or patient record."
        action={
          <Link to="/admin/appointments" className={buttonStyles()}>
            Back to appointments
          </Link>
        }
      />
    )
  }

  const active = isActiveAppointment(appointment)

  const confirmReason = async () => {
    if (!reasonMode) return
    if (reason.trim().length < 3) {
      setReasonError('Add a short reason so the patient understands.')
      return
    }
    try {
      if (reasonMode === 'reject') {
        await clinic.rejectAppointment(appointment.id, reason.trim())
        toast.success('Appointment rejected.')
      } else {
        await clinic.cancelAppointment(appointment.id, reason.trim())
        toast.success('Appointment cancelled.')
      }
      setReasonMode(null)
      setReason('')
      setReasonError('')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const confirmReschedule = async () => {
    if (!rescheduleTime) return
    try {
      await clinic.rescheduleAppointment(
        appointment.id,
        rescheduleDate,
        rescheduleTime,
        'admin',
      )
      setRescheduleOpen(false)
      setRescheduleTime('')
      toast.success('Appointment moved and confirmed.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const confirmAppointment = async () => {
    try {
      await clinic.confirmAppointment(appointment.id)
      toast.success('Appointment confirmed.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/appointments"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to appointments
        </Link>
      </div>

      <PageHeader
        title={patient.name}
        description={`${doctor.name}. ${formatDateLong(appointment.date)} at ${formatTime(
          appointment.time,
        )}.`}
        actions={<StatusChip status={appointment.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid sm:grid-cols-[1fr_180px]">
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <Avatar name={patient.name} size="lg" />
                  <div className="min-w-0">
                    <p className="title-1 text-ink">{patient.name}</p>
                    <p className="caption-5 text-muted">
                      {getAge(patient.dob)} years. {patient.gender}.{' '}
                      {appointment.natureOfVisit}.
                    </p>
                    <p className="mt-1 caption-5 text-muted">
                      Appointment ID{' '}
                      <span className="font-mono">
                        {appointment.id.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="caption-5 text-muted">Reason for visit</p>
                  <p className="mt-1 body-3 text-ink">{appointment.symptoms}</p>
                </div>

                <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <div>
                    <p className="caption-5 text-muted">Doctor</p>
                    <p className="mt-1 body-5 text-ink">{doctor.name}</p>
                    <p className="caption-5 text-muted">
                      {specialization?.name ?? doctor.designation}
                    </p>
                  </div>
                  <div>
                    <p className="caption-5 text-muted">Booked on</p>
                    <p className="mt-1 body-5 text-ink">
                      {formatDateShort(appointment.createdAt.slice(0, 10))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-1 border-t border-dashed border-line bg-paper/60 p-5 sm:border-l sm:border-t-0">
                <CalendarBlank
                  className="h-5 w-5 text-muted"
                  aria-hidden="true"
                />
                <p className="caption-4 text-muted">
                  {formatWeekday(appointment.date)}
                </p>
                <p className="heading-2 text-ink">
                  {formatDayNumber(appointment.date)}
                </p>
                <p className="title-3 text-muted">
                  {formatMonthShort(appointment.date)}
                </p>
                <p className="mt-2 flex items-center gap-1 font-mono text-sm font-medium text-ink">
                  <Clock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  {formatTime(appointment.time)}
                </p>
              </div>
            </div>
          </section>

          {appointment.cancellationReason ? (
            <div className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-4 body-6 text-danger">
              <WarningCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{appointment.cancellationReason}</span>
            </div>
          ) : null}

          {consultation ? (
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="caption-5 text-muted">Consultation note</p>
                  <h2 className="mt-1 title-1 text-ink">
                    {consultation.diagnosis}
                  </h2>
                </div>
                <span className="status-chip status-completed">
                  <span
                    className="h-2 w-2 rounded-full bg-current"
                    aria-hidden="true"
                  />
                  Completed
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="caption-5 text-muted">Physical exam</p>
                  <p className="mt-1 body-6 text-ink">
                    {consultation.physicalExam}
                  </p>
                </div>
                <div>
                  <p className="caption-5 text-muted">Treatment plan</p>
                  <p className="mt-1 body-6 text-ink">
                    {consultation.treatmentPlan}
                  </p>
                </div>
              </div>

              {consultation.prescription.length > 0 ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="caption-5 text-muted">Prescription</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {consultation.prescription.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 body-6 text-ink"
                      >
                        <span>{item.medicineName}</span>
                        <span className="font-mono text-xs text-muted">
                          {getDosageLabel(
                            item.morning,
                            item.afternoon,
                            item.night,
                            item.foodRelation,
                          )}{' '}
                          for {item.durationDays}{' '}
                          {item.durationDays === 1 ? 'day' : 'days'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <div className="card-flat">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="title-2 text-ink">Clinical record</p>
              </div>
              <p className="mt-2 body-6 text-ink/70">
                {appointment.status === 'completed'
                  ? 'This visit is marked complete but has no consultation note.'
                  : 'The consultation note will appear here after the doctor finalizes the visit.'}
              </p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Actions</h2>
            {active ? (
              <div className="mt-4 flex flex-col gap-2">
                {appointment.status === 'pending' ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => void confirmAppointment()}
                    >
                      Confirm appointment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setReason('')
                        setReasonError('')
                        setReasonMode('reject')
                      }}
                    >
                      Reject request
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => setRescheduleOpen(true)}
                    >
                      Reschedule appointment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setReason('')
                        setReasonError('')
                        setReasonMode('cancel')
                      }}
                    >
                      Cancel appointment
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-3 body-6 text-muted">
                No actions are available for a closed appointment.
              </p>
            )}
            {invoice ? (
              <Link
                to={`/admin/invoices/${invoice.id}`}
                className="link mt-4 inline-flex text-sm"
              >
                Open invoice{' '}
                <span className="font-mono">{invoice.invoiceNumber}</span>
              </Link>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Patient contact</h2>
            <div className="mt-3 flex flex-col gap-3">
              <a
                href={`tel:${patient.phone.replace(/\s/g, '')}`}
                className="flex items-start gap-2 body-6 text-ink hover:text-primary"
              >
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {patient.phone}
              </a>
              <a
                href={`mailto:${patient.email}`}
                className="flex items-start gap-2 body-6 break-all text-ink hover:text-primary"
              >
                <EnvelopeSimple
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {patient.email}
              </a>
              <p className="flex items-start gap-2 body-6 text-ink">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {patient.address}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-muted" aria-hidden="true" />
              <h2 className="title-1 text-ink">Doctor</h2>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={doctor.name} photoUrl={doctor.photoUrl} size="sm" />
              <div>
                <p className="body-5 text-ink">{doctor.name}</p>
                <p className="caption-5 text-muted">
                  {specialization?.name ?? doctor.designation}
                </p>
              </div>
            </div>
            <Link
              to={`/admin/doctors/${doctor.id}/edit`}
              className="link mt-3 inline-flex text-sm"
            >
              Edit doctor profile
            </Link>
          </section>

          {invoice ? (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="title-1 text-ink">Invoice</h2>
                <Receipt className="h-5 w-5 text-muted" aria-hidden="true" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-muted">
                  {invoice.invoiceNumber}
                </p>
                <InvoiceStatusChip status={invoice.status} />
              </div>
              <p className="mt-2 font-mono text-xl font-medium text-ink">
                {formatCurrency(getInvoiceTotals(invoice).total)}
              </p>
            </section>
          ) : null}

          <Link
            to="/admin/appointments"
            className={buttonStyles({ variant: 'ghost', className: 'w-full' })}
          >
            Back to all appointments
          </Link>
        </aside>
      </div>

      <Modal
        open={reasonMode !== null}
        onOpenChange={(open) => {
          if (!open) setReasonMode(null)
        }}
        title={
          reasonMode === 'reject'
            ? 'Reject this request?'
            : 'Cancel this appointment?'
        }
        description={
          reasonMode === 'reject'
            ? 'The patient will see the reason and can choose another slot.'
            : 'The visit will leave the clinic schedule and the patient will see the reason.'
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReasonMode(null)}
            >
              Keep appointment
            </Button>
            <Button type="button" variant="danger" onClick={confirmReason}>
              {reasonMode === 'reject' ? 'Reject request' : 'Cancel appointment'}
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Reason"
          placeholder="Add a short reason for the patient."
          value={reason}
          error={reasonError}
          onChange={(event) => {
            setReason(event.target.value)
            setReasonError('')
          }}
          required
        />
      </Modal>

      <Modal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Move this appointment"
        description={`Current visit: ${formatDateLong(
          appointment.date,
        )} at ${formatTime(appointment.time)}. The new slot is confirmed immediately.`}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRescheduleOpen(false)}
            >
              Keep current slot
            </Button>
            <Button
              type="button"
              onClick={confirmReschedule}
              disabled={!rescheduleTime}
            >
              Move appointment
            </Button>
          </>
        }
      >
        <SlotPicker
          dates={dates}
          date={rescheduleDate}
          onDateChange={(date) => {
            setRescheduleDate(date)
            setRescheduleTime('')
          }}
          slots={rescheduleSlots}
          time={rescheduleTime}
          onTimeChange={setRescheduleTime}
          availableDates={availableDates}
        />
      </Modal>
    </div>
  )
}
