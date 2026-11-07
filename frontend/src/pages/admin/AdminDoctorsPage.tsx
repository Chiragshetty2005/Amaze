import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Stethoscope } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import { Button, buttonStyles } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatCurrency, pluralize } from '../../lib/format'
import { formatAvailabilityDays } from '../../lib/availability'
import type { Doctor } from '../../types'

export function AdminDoctorsPage() {
  useDocumentMeta({
    title: 'Doctors | AmazeCare Admin',
    description: 'Add, edit, and remove doctors from the clinic.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [query, setQuery] = useState('')
  const [specializationId, setSpecializationId] = useState('')
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null)

  const normalized = query.trim().toLowerCase()
  const filtered = clinic.state.doctors
    .filter((doctor) => {
      if (specializationId && doctor.specializationId !== specializationId) {
        return false
      }
      const specialization = clinic.getSpecialization(doctor.specializationId)
      return [
        doctor.name,
        doctor.email,
        doctor.phone,
        specialization?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const confirmDelete = () => {
    if (!doctorToDelete) return
    clinic.deleteDoctor(doctorToDelete.id)
    toast.success(`${doctorToDelete.name} and their appointments were removed.`)
    setDoctorToDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctors"
        description={`${clinic.state.doctors.length} ${pluralize(
          clinic.state.doctors.length,
          'doctor',
        )} across ${clinic.state.specializations.length} departments.`}
        actions={
          <Link to="/admin/doctors/new" className={buttonStyles()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add doctor
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name or department"
          ariaLabel="Search doctors"
          className="sm:max-w-md"
        />
        <label className="flex items-center gap-2">
          <span className="sr-only">Filter by department</span>
          <select
            value={specializationId}
            onChange={(event) => setSpecializationId(event.target.value)}
            className="input w-full sm:w-56"
          >
            <option value="">All departments</option>
            {clinic.state.specializations
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((specialization) => (
                <option key={specialization.id} value={specialization.id}>
                  {specialization.name}
                </option>
              ))}
          </select>
        </label>
        <p className="caption-4 text-muted sm:ml-auto" aria-live="polite">
          {filtered.length} {pluralize(filtered.length, 'doctor')}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
          title={
            clinic.state.doctors.length === 0
              ? 'No doctors yet'
              : 'No doctor matches'
          }
          description={
            clinic.state.doctors.length === 0
              ? 'Add the first doctor to start taking appointments.'
              : 'Try a different name, email, or department filter.'
          }
          action={
            clinic.state.doctors.length === 0 ? (
              <Link to="/admin/doctors/new" className={buttonStyles()}>
                Add doctor
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div
          className="table-wrap"
          role="region"
          aria-label="Doctors"
          tabIndex={0}
        >
          <table className="table min-w-[940px]">
            <thead>
              <tr>
                <th scope="col">Doctor</th>
                <th scope="col">Department</th>
                <th scope="col">Clinic days</th>
                <th scope="col">Experience</th>
                <th scope="col">Fee</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doctor) => {
                const specialization = clinic.getSpecialization(
                  doctor.specializationId,
                )
                return (
                  <tr key={doctor.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={doctor.name}
                          photoUrl={doctor.photoUrl}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-ink">{doctor.name}</p>
                          <p className="caption-5 text-muted">
                            {doctor.qualification}
                          </p>
                          <p className="caption-5 text-muted">{doctor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>{specialization?.name ?? 'Unassigned'}</td>
                    <td className="max-w-48">
                      {formatAvailabilityDays(doctor.availability)}
                    </td>
                    <td className="font-mono">
                      {doctor.experienceYears} years
                    </td>
                    <td className="font-mono">{formatCurrency(doctor.fee)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/doctors/${doctor.id}/edit`}
                          className={buttonStyles({
                            variant: 'secondary',
                            size: 'sm',
                          })}
                        >
                          Edit
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          onClick={() => setDoctorToDelete(doctor)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption-5 text-muted">
        Removing a doctor also removes their appointments, consultations, and
        invoices from this demo.
      </p>

      <Modal
        open={doctorToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDoctorToDelete(null)
        }}
        title={`Remove ${doctorToDelete?.name ?? 'this doctor'}?`}
        description="This also removes every appointment, consultation, and invoice linked to the doctor. This cannot be undone."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDoctorToDelete(null)}
            >
              Keep doctor
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete}>
              Remove doctor
            </Button>
          </>
        }
      >
        <p className="body-6 text-ink/70">
          {doctorToDelete
            ? `${doctorToDelete.name} currently has ${
                clinic.getDoctorAppointments(doctorToDelete.id).length
              } appointments on record.`
            : null}
        </p>
      </Modal>
    </div>
  )
}
