import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { buttonStyles } from '../../components/ui/Button'
import { formatDayNumber, formatMonthShort, formatWeekday } from '../../lib/date'
import { pluralize } from '../../lib/format'

export function PatientRecordsPage() {
  useDocumentMeta({
    title: 'Medical records | AmazeCare',
    description: 'Consultation notes, prescriptions, and tests.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()
  const [query, setQuery] = useState('')

  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )

  if (!patient) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" aria-hidden="true" />}
        title="Records are unavailable"
        description="The patient record for this sign in could not be found."
      />
    )
  }

  const appointmentIds = new Set(
    clinic.getPatientAppointments(patient.id).map((item) => item.id),
  )
  const records = clinic.state.consultations
    .filter((consultation) => appointmentIds.has(consultation.appointmentId))
    .flatMap((consultation) => {
      const appointment = clinic.state.appointments.find(
        (item) => item.id === consultation.appointmentId,
      )
      const doctor = appointment
        ? clinic.getDoctor(appointment.doctorId)
        : undefined
      if (!appointment || !doctor) return []
      const specialization = clinic.getSpecialization(
        doctor.specializationId,
      )
      return [{ consultation, appointment, doctor, specialization }]
    })
    .sort((a, b) =>
      `${b.appointment.date}T${b.appointment.time}`.localeCompare(
        `${a.appointment.date}T${a.appointment.time}`,
      ),
    )

  const normalized = query.trim().toLowerCase()
  const filtered = records.filter((item) => {
    if (!normalized) return true
    return [
      item.consultation.diagnosis,
      item.consultation.symptoms,
      item.consultation.treatmentPlan,
      item.doctor.name,
      item.specialization?.name ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Medical records"
        description="Consultation notes, prescriptions, and tests from your visits."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by diagnosis, doctor, or symptom"
          ariaLabel="Search medical records"
          className="sm:max-w-md"
        />
        <p className="caption-4 text-muted" aria-live="polite">
          {filtered.length} {pluralize(filtered.length, 'record')}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlass className="h-6 w-6" aria-hidden="true" />}
          title={records.length === 0 ? 'No records yet' : 'No records match'}
          description={
            records.length === 0
              ? 'After a completed consultation, your notes and prescription will appear here.'
              : 'Try a different diagnosis, doctor, or symptom.'
          }
          action={
            records.length === 0 ? (
              <Link to="/patient/doctors" className={buttonStyles()}>
                Find a doctor
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {filtered.map(({ consultation, appointment, doctor, specialization }) => (
            <li
              key={consultation.id}
              className="border-t border-line first:border-t-0"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="flex min-w-0 gap-4">
                  <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-paper py-1 sm:w-14">
                    <span className="caption-5 text-muted">
                      {formatWeekday(appointment.date)}
                    </span>
                    <span className="title-2 text-ink">
                      {formatDayNumber(appointment.date)}
                    </span>
                    <span className="caption-5 text-muted">
                      {formatMonthShort(appointment.date)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="caption-5 text-muted">
                      {doctor.name}
                      {specialization ? `, ${specialization.name}` : ''}
                    </p>
                    <h2 className="title-1 text-ink">
                      {consultation.diagnosis}
                    </h2>
                    <p className="mt-1 line-clamp-2 body-6 text-muted">
                      {consultation.treatmentPlan}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 caption-5 text-muted">
                      <span>
                        {consultation.prescription.length}{' '}
                        {pluralize(
                          consultation.prescription.length,
                          'medicine',
                        )}
                      </span>
                      <span>
                        {consultation.testIds.length}{' '}
                        {pluralize(consultation.testIds.length, 'test')}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/patient/records/${consultation.id}`}
                  className={buttonStyles({
                    variant: 'secondary',
                    size: 'sm',
                    className: 'self-start',
                  })}
                >
                  View record
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
