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
import { formatCurrency, getAge, getDosageLabel } from '../../lib/format'
import { getInvoiceTotals } from '../../lib/invoice'
import { getAvailableSlotsForDoctor, getNextAvailableSlot } from '../../lib/slots'
import { isActiveAppointment } from '../../lib/selectors'

type ReasonMode = 'reject' | 'cancel'

export function DoctorAppointmentDetailPage() {
  useDocumentMeta({
    title: 'Appointment | AmazeCare Doctor',
    description: 'Review the patient, confirm the visit, or start a consultation.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const clinic = useClinic()

  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)
  const rawAppointment = clinic.state.appointments.find(
    (item) => item.id === id,
  )
  const appointment =
    rawAppointment && doctor && rawAppointment.doctorId === doctor.id
      ? rawAppointment
      : undefined
  const patient = appointment
    ? clinic.getPatient(appointment.patientId)
    : undefined
  const consultation = appointment
    ? clinic.getConsultationForAppointment(appointment.id)
    : undefined
  const invoice = appointment
    ? clinic.getInvoiceForAppointment(appointment.id)
    : undefined

  const dates = useMemo(() => getNextDays(14), [])
  const nextAvailable = useMemo(
    () => (doctor ? getNextAvailableSlot(doctor, clinic.state.appointments) : null),
    [doctor, clinic.state.appointments],
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
      if (
        getAvailableSlotsForDoctor(doctor, date, clinic.state.appointments).length >
        0
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

  if (!doctor || !appointment || !patient) {
    return (
      <EmptyState
        icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
        title="Appointment not found"
        description="This appointment is not on your schedule, or it may have been removed."
        action={
          <Link to="/doctor/appointments" className={buttonStyles()}>
            Back to appointments
          </Link>
        }
      />
    )
  }

  const active = isActiveAppointment(appointment)
  const patientAppointments = clinic
    .getPatientAppointments(patient.id)
    .slice()
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  const previousVisits = patientAppointments
    .filter(
      (item) =>
        item.id !== appointment.id &&
        (item.status === 'completed' || item.status === 'cancelled'),
    )
    .slice(0, 4)
  const consultationHistory = patientAppointments
    .flatMap((item) => {
      const note = clinic.getConsultationForAppointment(item.id)
      return note && item.id !== appointment.id
        ? [{ appointment: item, consultation: note }]
        : []
    })
    .sort((a, b) => b.appointment.date.localeCompare(a.appointment.date))

  const openReason = (mode: ReasonMode) => {
    setReason('')
    setReasonError('')
    setReasonMode(mode)
  }

  const confirmReason = () => {
    if (!reasonMode) return
    if (reason.trim().length < 3) {
      setReasonError('Add a short reason so the patient understands.')
      return
    }
    if (reasonMode === 'reject') {
      clinic.rejectAppointment(appointment.id, reason.trim())
      toast.success('Appointment rejected. The patient can book another slot.')
    } else {
      clinic.cancelAppointment(appointment.id, reason.trim())
      toast.success('Appointment cancelled.')
    }
    setReasonMode(null)
    setReason('')
    setReasonError('')
  }

  const confirmReschedule = () => {
    if (!rescheduleTime) return
    clinic.rescheduleAppointment(
      appointment.id,
      rescheduleDate,
      rescheduleTime,
      'doctor',
    )
    setRescheduleOpen(false)
    setRescheduleTime('')
    toast.success('Appointment moved and confirmed.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/doctor/appointments"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to appointments
        </Link>
      </div>

      <PageHeader
        title={patient.name}
        description={`${getAge(patient.dob)} years. ${patient.gender}. ${
          appointment.natureOfVisit
        }.`}
        actions={<StatusChip status={appointment.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid sm:grid-cols-[1fr_180px]">
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Avatar name={patient.name} size="lg" />
                  <div>
                    <p className="title-1 text-ink">{patient.name}</p>
                    <p className="caption-5 text-muted">
                      Patient ID{' '}
                      <span className="font-mono">
                        {patient.id.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="caption-5 text-muted">Reason for visit</p>
                  <p className="mt-1 body-3 text-ink">{appointment.symptoms}</p>
                </div>

                <dl className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <div>
                    <dt className="caption-5 text-muted">Nature of visit</dt>
                    <dd className="body-5 text-ink">{appointment.natureOfVisit}</dd>
                  </div>
                  <div>
                    <dt className="caption-5 text-muted">Booked on</dt>
                    <dd className="body-5 text-ink">
                      {formatDateShort(appointment.createdAt.slice(0, 10))}
                    </dd>
                  </div>
                  <div>
                    <dt className="caption-5 text-muted">Phone</dt>
                    <dd className="body-5 text-ink">{patient.phone}</dd>
                  </div>
                  <div>
                    <dt className="caption-5 text-muted">Email</dt>
                    <dd className="body-6 break-all text-ink">
                      {patient.email}
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

          {appointment.cancellationReason ? (
            <div className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-4 body-6 text-danger">
              <WarningCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                {appointment.status === 'rejected'
                  ? 'This request was rejected. '
                  : 'This appointment was cancelled. '}
                {appointment.cancellationReason}
              </span>
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
                  <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
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
                        className="flex items-center justify-between gap-3 body-6 text-ink"
                      >
                        <span>{item.medicineName}</span>
                        <span className="font-mono text-xs text-muted">
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
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted" aria-hidden="true" />
              <h2 className="heading-5 text-ink">Patient history</h2>
            </div>
            {consultationHistory.length > 0 ? (
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {consultationHistory.map(({ appointment: visit, consultation: note }) => (
                  <li
                    key={note.id}
                    className="border-t border-line first:border-t-0"
                  >
                    <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="body-5 text-ink">{note.diagnosis}</p>
                        <p className="caption-5 text-muted">
                          <span className="font-mono">
                            {formatDateShort(visit.date)}
                          </span>
                          . {visit.natureOfVisit}.
                        </p>
                      </div>
                      <span className="caption-5 text-muted">
                        {note.prescription.length} medicines. {note.testIds.length}{' '}
                        tests.
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="body-6 text-muted">
                  No previous consultation notes for this patient.
                </p>
              </div>
            )}
          </section>
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
                      onClick={() => {
                        clinic.confirmAppointment(appointment.id)
                        toast.success('Appointment confirmed.')
                      }}
                    >
                      Confirm appointment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => openReason('reject')}
                    >
                      Reject request
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      to={`/doctor/appointments/${appointment.id}/consult`}
                      className={buttonStyles()}
                    >
                      Start consultation
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setRescheduleOpen(true)}
                    >
                      Reschedule
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => openReason('cancel')}
                    >
                      Cancel appointment
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to={`/doctor/patients/${patient.id}`}
                  className={buttonStyles({ variant: 'secondary' })}
                >
                  Open patient record
                </Link>
                {consultation ? (
                  <p className="caption-5 text-muted">
                    This visit is complete. The consultation note is on this
                    page.
                  </p>
                ) : null}
              </div>
            )}
            <p className="mt-4 caption-5 text-muted">
              Appointment ID{' '}
              <span className="font-mono text-ink">
                {appointment.id.toUpperCase()}
              </span>
            </p>
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

          {invoice ? (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="title-1 text-ink">Invoice</h2>
                <Receipt className="h-5 w-5 text-muted" aria-hidden="true" />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-muted">
                    {invoice.invoiceNumber}
                  </p>
                  <InvoiceStatusChip status={invoice.status} />
                </div>
                <p className="font-mono text-xl font-medium text-ink">
                  {formatCurrency(getInvoiceTotals(invoice).total)}
                </p>
              </div>
            </section>
          ) : (
            <div className="card-flat">
              <div className="flex items-center gap-2">
                <Stethoscope
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
                <p className="title-2 text-ink">Consultation checklist</p>
              </div>
              <ul className="mt-3 flex flex-col gap-2 body-6 text-ink/70">
                <li>Review the patient history.</li>
                <li>Record symptoms and the physical exam.</li>
                <li>Add tests and the prescription.</li>
                <li>Finalize to create the invoice.</li>
              </ul>
            </div>
          )}

          {previousVisits.length > 0 ? (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="title-1 text-ink">Previous visits</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {previousVisits.map((visit) => (
                  <li key={visit.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="body-6 text-ink">
                        {formatDateShort(visit.date)}
                      </p>
                      <p className="caption-5 text-muted">{visit.natureOfVisit}</p>
                    </div>
                    <StatusChip status={visit.status} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <Modal
        open={reasonMode !== null}
        onOpenChange={(open) => {
          if (!open) setReasonMode(null)
        }}
        title={
          reasonMode === 'reject'
            ? 'Reject this appointment?'
            : 'Cancel this appointment?'
        }
        description={
          reasonMode === 'reject'
            ? 'The patient will see the reason and can request another slot.'
            : 'The visit will be removed from your clinic day. The patient will see the reason.'
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
          placeholder="For example, an emergency, a theatre list, or a slot that no longer works."
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setReasonError('')
          }}
          error={reasonError}
          required
        />
      </Modal>

      <Modal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        title="Move this appointment"
        description={`Current visit: ${formatDateLong(
          appointment.date,
        )} at ${formatTime(appointment.time)}. The new slot will be confirmed immediately.`}
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
