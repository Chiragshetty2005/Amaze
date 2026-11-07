import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarBlank,
  EnvelopeSimple,
  FileText,
  MapPin,
  Phone,
  Stethoscope,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import { getAge, pluralize } from '../../lib/format'
import {
  formatDateLong,
  formatDateShort,
  formatTime,
} from '../../lib/date'
import { getUpcomingAppointments } from '../../lib/selectors'

export function DoctorPatientDetailPage() {
  useDocumentMeta({
    title: 'Patient record | AmazeCare Doctor',
    description: 'Visit history and consultation notes for a patient.',
    robots: 'noindex,nofollow',
  })

  const { patientId } = useParams<{ patientId: string }>()
  const { user } = useAuth()
  const clinic = useClinic()

  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)
  const patient = clinic.state.patients.find((item) => item.id === patientId)
  const sharedAppointments = doctor
    ? clinic
        .getDoctorAppointments(doctor.id)
        .filter((appointment) => appointment.patientId === patientId)
    : []

  if (!doctor || !patient || sharedAppointments.length === 0) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="Patient record not found"
        description="This patient is not in your care list, or the record may have been removed."
        action={
          <Link to="/doctor/patients" className={buttonStyles()}>
            Back to patients
          </Link>
        }
      />
    )
  }

  const sorted = sharedAppointments
    .slice()
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  const upcoming = getUpcomingAppointments(sharedAppointments)
  const next = upcoming[0]
  const completed = sorted.filter(
    (appointment) => appointment.status === 'completed',
  )
  const consultations = sorted.flatMap((appointment) => {
    const consultation = clinic.getConsultationForAppointment(appointment.id)
    return consultation ? [{ appointment, consultation }] : []
  })
  const completedVisits = completed.length
  const lastVisit = completed[0]?.date
  const prescriptionCount = consultations.reduce(
    (sum, item) => sum + item.consultation.prescription.length,
    0,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to patients
        </Link>
      </div>

      <PageHeader
        title={patient.name}
        description={`${getAge(patient.dob)} years. ${patient.gender}. Patient ID ${patient.id.toUpperCase()}.`}
        actions={
          next ? (
            <Link
              to={`/doctor/appointments/${next.id}`}
              className={buttonStyles({ variant: 'secondary' })}
            >
              Next appointment
            </Link>
          ) : undefined
        }
      />

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid sm:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Avatar name={patient.name} size="xl" />
              <div>
                <h2 className="heading-5 text-ink">{patient.name}</h2>
                <p className="body-6 text-muted">
                  {getAge(patient.dob)} years. {patient.gender}.
                </p>
                <p className="mt-1 caption-5 text-muted">
                  Date of birth {formatDateLong(patient.dob)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <div>
                <p className="caption-5 text-muted">Phone</p>
                <a
                  href={`tel:${patient.phone.replace(/\s/g, '')}`}
                  className="mt-1 inline-flex items-center gap-1.5 body-6 text-ink hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted" aria-hidden="true" />
                  {patient.phone}
                </a>
              </div>
              <div>
                <p className="caption-5 text-muted">Email</p>
                <a
                  href={`mailto:${patient.email}`}
                  className="mt-1 inline-flex items-start gap-1.5 body-6 break-all text-ink hover:text-primary"
                >
                  <EnvelopeSimple
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  {patient.email}
                </a>
              </div>
              <div>
                <p className="caption-5 text-muted">Address</p>
                <p className="mt-1 flex items-start gap-1.5 body-6 text-ink">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  {patient.address}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 border-t border-line bg-paper/60 p-5 sm:border-l sm:border-t-0">
            <div>
              <p className="caption-5 text-muted">Completed visits</p>
              <p className="heading-4 text-ink">{completedVisits}</p>
            </div>
            <div>
              <p className="caption-5 text-muted">Last visit</p>
              <p className="body-5 text-ink">
                {lastVisit ? formatDateShort(lastVisit) : 'No completed visit'}
              </p>
            </div>
            <div>
              <p className="caption-5 text-muted">Next visit</p>
              <p className="body-5 text-ink">
                {next ? `${formatDateShort(next.date)} at ${formatTime(next.time)}` : 'Not booked'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Consultation notes</dt>
          <dd className="heading-5 text-ink">{consultations.length}</dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Medicines prescribed</dt>
          <dd className="heading-5 text-ink">{prescriptionCount}</dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Upcoming visits</dt>
          <dd className="heading-5 text-ink">{upcoming.length}</dd>
        </div>
        <div className="flex flex-col gap-1 bg-surface p-4">
          <dt className="caption-5 text-muted">Appointments</dt>
          <dd className="heading-5 text-ink">{sharedAppointments.length}</dd>
        </div>
      </dl>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <CalendarBlank className="h-5 w-5 text-muted" aria-hidden="true" />
            <h2 className="heading-5 text-ink">Visit history</h2>
          </div>
          {sorted.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {sorted.map((appointment) => (
                <li
                  key={appointment.id}
                  className="border-t border-line first:border-t-0"
                >
                  <Link
                    to={`/doctor/appointments/${appointment.id}`}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-paper sm:flex-row sm:items-center sm:p-5"
                  >
                    <div className="flex w-full items-center gap-3 sm:w-36 sm:flex-col sm:items-start sm:gap-0">
                      <span className="font-mono text-sm font-medium text-ink">
                        {formatDateShort(appointment.date)}
                      </span>
                      <span className="caption-5 text-muted">
                        <span className="font-mono">
                          {formatTime(appointment.time)}
                        </span>
                        . {appointment.natureOfVisit}.
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="body-5 text-ink">{appointment.symptoms}</p>
                      {clinic.getConsultationForAppointment(appointment.id) ? (
                        <p className="mt-1 caption-5 text-muted">
                          {
                            clinic.getConsultationForAppointment(appointment.id)
                              ?.diagnosis
                          }
                        </p>
                      ) : null}
                    </div>
                    <StatusChip status={appointment.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="body-6 text-muted">No visits recorded.</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <FileText className="h-5 w-5 text-muted" aria-hidden="true" />
            <h2 className="heading-5 text-ink">Consultation notes</h2>
          </div>
          {consultations.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {consultations.map(({ appointment, consultation }) => (
                <li
                  key={consultation.id}
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="caption-5 text-muted">
                        {formatDateShort(appointment.date)}. {appointment.natureOfVisit}.
                      </p>
                      <h3 className="title-1 text-ink">
                        {consultation.diagnosis}
                      </h3>
                    </div>
                    <Link
                      to={`/doctor/appointments/${appointment.id}`}
                      className="link text-sm"
                    >
                      Open visit
                    </Link>
                  </div>
                  <p className="mt-2 line-clamp-2 body-6 text-muted">
                    {consultation.treatmentPlan}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 caption-5 text-muted">
                    <span>
                      {consultation.prescription.length}{' '}
                      {pluralize(consultation.prescription.length, 'medicine')}
                    </span>
                    <span>
                      {consultation.testIds.length}{' '}
                      {pluralize(consultation.testIds.length, 'test')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="body-6 text-muted">
                No consultation notes for this patient yet.
              </p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          {next ? (
            <div className="card-flat">
              <p className="caption-4 text-ink/70">Next appointment</p>
              <p className="mt-2 heading-5 text-ink">
                {formatDateShort(next.date)}
              </p>
              <p className="font-mono text-sm text-ink">
                {formatTime(next.time)}
              </p>
              <p className="mt-2 body-6 text-ink/70">{next.symptoms}</p>
              <div className="mt-4 flex flex-col gap-2">
                {next.status === 'confirmed' ? (
                  <Link
                    to={`/doctor/appointments/${next.id}/consult`}
                    className={buttonStyles()}
                  >
                    Start consultation
                  </Link>
                ) : null}
                <Link
                  to={`/doctor/appointments/${next.id}`}
                  className={buttonStyles({ variant: 'secondary' })}
                >
                  Open appointment
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="title-1 text-ink">Next appointment</h2>
              <p className="mt-2 body-6 text-muted">
                No upcoming visit is booked with you.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Care notes</h2>
            <p className="mt-2 body-6 text-muted">
              Review the previous diagnosis and prescription before the next
              visit. Notes are shared with the patient after a consultation is
              finalized.
            </p>
          </div>

          <Link
            to="/doctor/patients"
            className={buttonStyles({ variant: 'ghost', className: 'w-full' })}
          >
            Back to all patients
          </Link>
        </aside>
      </div>
    </div>
  )
}
