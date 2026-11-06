import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  FileText,
  Receipt,
  Stethoscope,
  WarningCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Button, buttonStyles } from '../../components/ui/Button'
import { StatusChip, InvoiceStatusChip } from '../../components/ui/StatusChip'
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
import {
  formatCurrency,
  getDosageLabel,
} from '../../lib/format'
import { getInvoiceTotals } from '../../lib/invoice'
import { getAvailableSlotsForDoctor, getNextAvailableSlot } from '../../lib/slots'
import { isActiveAppointment } from '../../lib/selectors'

export function PatientAppointmentDetailPage() {
  useDocumentMeta({
    title: 'Appointment details | AmazeCare',
    description: 'View the appointment, reschedule, or cancel.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const clinic = useClinic()

  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )
  const rawAppointment = clinic.state.appointments.find(
    (item) => item.id === id,
  )
  const appointment =
    rawAppointment && patient && rawAppointment.patientId === patient.id
      ? rawAppointment
      : undefined
  const doctor = appointment
    ? clinic.getDoctor(appointment.doctorId)
    : undefined
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
    () =>
      doctor ? getNextAvailableSlot(doctor, clinic.state.appointments) : null,
    [doctor, clinic.state.appointments],
  )

  const [rescheduleOpen, setRescheduleOpen] = useState(
    () => searchParams.get('reschedule') === '1',
  )
  const [rescheduleDate, setRescheduleDate] = useState(
    nextAvailable?.date ?? dates[0],
  )
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    setRescheduleDate(nextAvailable?.date ?? dates[0])
    setRescheduleTime('')
  }, [appointment?.id, dates, nextAvailable])

  const rescheduleAvailableDates = useMemo(() => {
    const set = new Set<string>()
    if (!doctor) return set
    dates.forEach((date) => {
      if (
        getAvailableSlotsForDoctor(
          doctor,
          date,
          clinic.state.appointments,
        ).length > 0
      ) {
        set.add(date)
      }
    })
    return set
  }, [doctor, dates, clinic.state.appointments])

  const rescheduleSlots = useMemo(
    () =>
      doctor
        ? getAvailableSlotsForDoctor(
            doctor,
            rescheduleDate,
            clinic.state.appointments,
          )
        : [],
    [doctor, rescheduleDate, clinic.state.appointments],
  )

  if (!appointment || !doctor || !patient) {
    return (
      <EmptyState
        icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
        title="Appointment not found"
        description="This appointment does not belong to your account, or it may have been removed."
        action={
          <Link to="/patient/appointments" className={buttonStyles()}>
            Back to appointments
          </Link>
        }
      />
    )
  }

  const active = isActiveAppointment(appointment)

  const confirmReschedule = () => {
    if (!rescheduleTime) return
    clinic.rescheduleAppointment(
      appointment.id,
      rescheduleDate,
      rescheduleTime,
      'patient',
    )
    setRescheduleOpen(false)
    setRescheduleTime('')
    toast.success('Appointment rescheduled. The new slot is pending confirmation.')
  }

  const confirmCancel = () => {
    if (cancelReason.trim().length < 3) {
      setCancelError('Add a short reason so the clinic understands.')
      return
    }
    clinic.cancelAppointment(appointment.id, cancelReason.trim())
    setCancelOpen(false)
    setCancelReason('')
    setCancelError('')
    toast.success('Appointment cancelled.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/patient/appointments"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to appointments
        </Link>
      </div>

      <PageHeader
        title="Appointment details"
        description={`With ${doctor.name}, ${specialization?.name ?? doctor.designation}.`}
        actions={<StatusChip status={appointment.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid sm:grid-cols-[1fr_180px]">
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Avatar name={doctor.name} size="lg" />
                  <div>
                    <h2 className="title-1 text-ink">{doctor.name}</h2>
                    <p className="caption-2 text-muted">
                      {specialization?.name ?? doctor.designation}
                    </p>
                    <p className="caption-5 text-muted">
                      {doctor.qualification}
                    </p>
                  </div>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="caption-5 text-muted">Date</dt>
                    <dd className="body-5 text-ink">
                      {formatDateLong(appointment.date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="caption-5 text-muted">Time</dt>
                    <dd className="font-mono text-sm font-medium text-ink">
                      {formatTime(appointment.time)}
                    </dd>
                  </div>
                  <div>
                    <dt className="caption-5 text-muted">Nature of visit</dt>
                    <dd className="body-5 text-ink">
                      {appointment.natureOfVisit}
                    </dd>
                  </div>
                  <div>
                    <dt className="caption-5 text-muted">Booked on</dt>
                    <dd className="body-5 text-ink">
                      {formatDateShort(appointment.createdAt.slice(0, 10))}
                    </dd>
                  </div>
                </dl>
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

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="title-1 text-ink">What brings you in</h2>
            <p className="mt-2 body-6 text-muted">{appointment.symptoms}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4">
              <p className="caption-5 text-muted">
                Appointment ID{' '}
                <span className="font-mono text-ink">
                  {appointment.id.toUpperCase()}
                </span>
              </p>
              <p className="caption-5 text-muted">
                Patient ID{' '}
                <span className="font-mono text-ink">
                  {patient.id.toUpperCase()}
                </span>
              </p>
            </div>
          </section>

          {appointment.cancellationReason ? (
            <div className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-4 body-6 text-danger">
              <WarningCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                {appointment.status === 'rejected'
                  ? 'The doctor could not take this appointment. '
                  : 'This appointment was cancelled. '}
                {appointment.cancellationReason}
              </span>
            </div>
          ) : null}

          {consultation ? (
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="caption-5 text-muted">Consultation record</p>
                  <h2 className="title-1 text-ink">
                    {consultation.diagnosis}
                  </h2>
                </div>
                <Link
                  to={`/patient/records/${consultation.id}`}
                  className="link text-sm"
                >
                  Open full record
                </Link>
              </div>
              <p className="mt-2 body-6 text-muted">
                {consultation.treatmentPlan}
              </p>
              {consultation.prescription.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                  {consultation.prescription.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 body-6 text-ink"
                    >
                      <span>
                        {item.medicineName}{' '}
                        <span className="text-muted">
                          for {item.durationDays} days
                        </span>
                      </span>
                      <span className="font-mono text-xs text-ink">
                        {getDosageLabel(
                          item.morning,
                          item.afternoon,
                          item.night,
                          item.foodRelation,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Actions</h2>
            {active ? (
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRescheduleOpen(true)}
                >
                  Reschedule appointment
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCancelOpen(true)}
                >
                  {appointment.status === 'pending'
                    ? 'Cancel request'
                    : 'Cancel appointment'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {consultation ? (
                  <Link
                    to={`/patient/records/${consultation.id}`}
                    className={buttonStyles()}
                  >
                    View consultation record
                  </Link>
                ) : null}
                <Link
                  to={`/patient/book/${doctor.id}`}
                  className={buttonStyles({
                    variant: consultation ? 'secondary' : 'primary',
                  })}
                >
                  Book again
                </Link>
              </div>
            )}
            <p className="mt-4 caption-5 text-muted">
              Need to change something else? Call the clinic at +91 80 4123
              8800.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-1 text-ink">Payment</h2>
              <Receipt className="h-5 w-5 text-muted" aria-hidden="true" />
            </div>
            {invoice ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-muted">
                    {invoice.invoiceNumber}
                  </p>
                  <InvoiceStatusChip status={invoice.status} />
                </div>
                <p className="font-mono text-2xl font-medium text-ink">
                  {formatCurrency(getInvoiceTotals(invoice).total)}
                </p>
                <Link to="/patient/bills" className="link text-sm">
                  Open bills
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <p className="body-6 text-muted">
                  The invoice is created after the consultation is completed.
                </p>
                <p className="caption-5 text-muted">
                  Consultation fee{' '}
                  <span className="font-mono text-ink">
                    {formatCurrency(doctor.fee)}
                  </span>
                </p>
              </div>
            )}
          </section>

          {consultation ? (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted" aria-hidden="true" />
                <h2 className="title-1 text-ink">Record summary</h2>
              </div>
              <p className="mt-3 caption-5 text-muted">Symptoms</p>
              <p className="body-6 text-ink">{consultation.symptoms}</p>
              <p className="mt-3 caption-5 text-muted">Physical exam</p>
              <p className="body-6 text-ink">{consultation.physicalExam}</p>
            </section>
          ) : (
            <div className="card-flat">
              <div className="flex items-center gap-2">
                <Stethoscope
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <p className="title-2 text-ink">Before your visit</p>
              </div>
              <p className="mt-2 body-6 text-ink/70">
                Arrive 10 minutes early with a photo ID and any previous
                prescriptions. Wear a mask if you have a cough or fever.
              </p>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Choose a new slot"
        description={`Current visit: ${formatDateLong(
          appointment.date,
        )} at ${formatTime(appointment.time)}. The new slot needs doctor confirmation.`}
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
              Confirm new slot
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
          availableDates={rescheduleAvailableDates}
        />
      </Modal>

      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this appointment?"
        description="The slot will be released for other patients. You can book again at any time."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelOpen(false)}
            >
              Keep appointment
            </Button>
            <Button type="button" variant="danger" onClick={confirmCancel}>
              Cancel appointment
            </Button>
          </>
        }
      >
        <TextAreaField
          label="Reason for cancelling"
          placeholder="For example, a schedule clash or a change in symptoms."
          value={cancelReason}
          onChange={(event) => {
            setCancelReason(event.target.value)
            setCancelError('')
          }}
          error={cancelError}
          required
        />
      </Modal>
    </div>
  )
}
