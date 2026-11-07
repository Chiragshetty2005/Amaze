import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import { buttonStyles } from '../../components/ui/Button'
import { getAge, pluralize } from '../../lib/format'
import { formatDateShort, todayISO } from '../../lib/date'
import { getUpcomingAppointments } from '../../lib/selectors'

export function DoctorPatientsPage() {
  useDocumentMeta({
    title: 'Patients | AmazeCare Doctor',
    description: 'The patients under your care and their visit history.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()
  const [query, setQuery] = useState('')

  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)

  if (!doctor) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
        title="Patient list not found"
        description="The doctor record for this sign in could not be found."
      />
    )
  }

  const appointments = clinic.getDoctorAppointments(doctor.id)
  const patientRows = Array.from(
    new Set(appointments.map((appointment) => appointment.patientId)),
  )
    .flatMap((patientId) => {
      const patient = clinic.getPatient(patientId)
      if (!patient) return []
      const patientAppointments = appointments.filter(
        (appointment) => appointment.patientId === patientId,
      )
      const completed = patientAppointments
        .filter((appointment) => appointment.status === 'completed')
        .sort((a, b) =>
          `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
        )
      const upcoming = getUpcomingAppointments(patientAppointments)
      return [
        {
          patient,
          visits: completed.length,
          lastVisit: completed[0]?.date,
          nextVisit: upcoming[0]?.date,
          requestPending: upcoming.some(
            (appointment) => appointment.status === 'pending',
          ),
        },
      ]
    })
    .sort((a, b) => a.patient.name.localeCompare(b.patient.name))

  const normalized = query.trim().toLowerCase()
  const filtered = patientRows.filter((row) =>
    [row.patient.name, row.patient.email, row.patient.phone]
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description={`${patientRows.length} ${pluralize(
          patientRows.length,
          'patient',
        )} under your care.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name or phone"
          ariaLabel="Search patients"
          className="sm:max-w-md"
        />
        <p className="caption-4 text-muted" aria-live="polite">
          {filtered.length} {pluralize(filtered.length, 'patient')}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title={patientRows.length === 0 ? 'No patients yet' : 'No patient matches'}
          description={
            patientRows.length === 0
              ? 'Patients appear here after their first appointment with you.'
              : 'Try a different name, email, or phone number.'
          }
        />
      ) : (
        <div
          className="table-wrap"
          role="region"
          aria-label="Patients"
          tabIndex={0}
        >
          <table className="table min-w-[820px]">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Contact</th>
                <th scope="col">Visits</th>
                <th scope="col">Last visit</th>
                <th scope="col">Next visit</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.patient.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={row.patient.name} size="sm" />
                      <div>
                        <p className="font-medium text-ink">{row.patient.name}</p>
                        <p className="caption-5 text-muted">
                          {getAge(row.patient.dob)} years. {row.patient.gender}.
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p>{row.patient.phone}</p>
                    <p className="caption-5 text-muted">{row.patient.email}</p>
                  </td>
                  <td className="font-mono">{row.visits}</td>
                  <td>
                    {row.lastVisit ? (
                      formatDateShort(row.lastVisit)
                    ) : (
                      <span className="text-muted">No completed visit</span>
                    )}
                  </td>
                  <td>
                    {row.nextVisit ? (
                      <div className="flex flex-col gap-1">
                        <span>{formatDateShort(row.nextVisit)}</span>
                        {row.requestPending ? (
                          <span className="status-chip status-pending w-fit">
                            <span
                              className="h-2 w-2 rounded-full bg-current"
                              aria-hidden="true"
                            />
                            Request
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted">Not booked</span>
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/doctor/patients/${row.patient.id}`}
                      className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                    >
                      Open record
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption-5 text-muted">
        Only patients who have booked with you appear in this list. Today is{' '}
        {formatDateShort(todayISO())}.
      </p>
    </div>
  )
}
