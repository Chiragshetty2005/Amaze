import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Users } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import {
  SelectField,
  TextAreaField,
  TextField,
} from '../../components/ui/Form'
import { apiErrorMessage } from '../../lib/api'
import { getAge, pluralize } from '../../lib/format'
import { formatDateShort, todayISO } from '../../lib/date'
import { getUpcomingAppointments } from '../../lib/selectors'
import type { Patient } from '../../types'

const patientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the patient name.')
    .max(80, 'Keep the name under 80 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9][0-9 ]{7,15}$/,
      'Use digits only, with an optional country code.',
    ),
  dob: z
    .string()
    .min(1, 'Enter the date of birth.')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00`)
      return !Number.isNaN(date.getTime()) && date <= new Date()
    }, 'The date of birth cannot be in the future.')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00`)
      return date >= new Date('1900-01-01')
    }, 'Enter a date after 1900.'),
  gender: z.enum(['Female', 'Male', 'Other'], {
    message: 'Choose a gender.',
  }),
  address: z
    .string()
    .trim()
    .min(5, 'Enter the address.')
    .max(220, 'Keep the address under 220 characters.'),
})

type PatientValues = z.infer<typeof patientSchema>

export function AdminPatientsPage() {
  useDocumentMeta({
    title: 'Patients | AmazeCare Admin',
    description: 'Register, update, and manage patient records.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PatientValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      dob: '',
      gender: 'Female',
      address: '',
    },
  })

  useEffect(() => {
    if (!editorOpen) return
    reset({
      name: editingPatient?.name ?? '',
      email: editingPatient?.email ?? '',
      phone: editingPatient?.phone ?? '',
      dob: editingPatient?.dob ?? '',
      gender: editingPatient?.gender ?? 'Female',
      address: editingPatient?.address ?? '',
    })
  }, [editorOpen, editingPatient, reset])

  const normalized = query.trim().toLowerCase()
  const filtered = clinic.state.patients
    .filter((patient) =>
      [patient.name, patient.email, patient.phone]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const openNew = () => {
    setEditingPatient(null)
    setEditorOpen(true)
  }

  const openEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setEditorOpen(true)
  }

  const onSubmit = async (values: PatientValues) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (editingPatient) {
      clinic.updatePatient(editingPatient.id, values)
      toast.success('Patient record updated.')
    } else {
      clinic.addPatient(values)
      toast.success('Patient registered.')
    }
    setEditorOpen(false)
    setEditingPatient(null)
  }

  const confirmDelete = () => {
    if (!patientToDelete) return
    clinic.deletePatient(patientToDelete.id)
    toast.success(`${patientToDelete.name} was removed.`)
    setPatientToDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description={`${clinic.state.patients.length} ${pluralize(
          clinic.state.patients.length,
          'patient record',
        )} in the clinic.`}
        actions={
          <Button type="button" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Register patient
          </Button>
        }
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
          title={
            clinic.state.patients.length === 0
              ? 'No patients yet'
              : 'No patient matches'
          }
          description={
            clinic.state.patients.length === 0
              ? 'Register the first patient to start booking visits.'
              : 'Try a different name, email, or phone number.'
          }
          action={
            clinic.state.patients.length === 0 ? (
              <Button type="button" onClick={openNew}>
                Register patient
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="table-wrap"
          role="region"
          aria-label="Patients"
          tabIndex={0}
        >
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Contact</th>
                <th scope="col">Visits</th>
                <th scope="col">Next visit</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => {
                const appointments = clinic.getPatientAppointments(patient.id)
                const next = getUpcomingAppointments(appointments)[0]
                const completedVisits = appointments.filter(
                  (appointment) => appointment.status === 'completed',
                ).length
                return (
                  <tr key={patient.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={patient.name} size="sm" />
                        <div>
                          <p className="font-medium text-ink">{patient.name}</p>
                          <p className="caption-5 text-muted">
                            {getAge(patient.dob)} years. {patient.gender}.
                          </p>
                          <p className="caption-5 text-muted">
                            Born {formatDateShort(patient.dob)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p>{patient.phone}</p>
                      <p className="caption-5 text-muted">{patient.email}</p>
                      <p className="max-w-52 truncate caption-5 text-muted">
                        {patient.address}
                      </p>
                    </td>
                    <td className="font-mono">{completedVisits}</td>
                    <td>
                      {next ? (
                        <div className="flex flex-col gap-1">
                          <span>{formatDateShort(next.date)}</span>
                          <span className="caption-5 text-muted">
                            {next.natureOfVisit}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">Not booked</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(patient)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          onClick={() => setPatientToDelete(patient)}
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
        Today is {formatDateShort(todayISO())}. Removing a patient also removes
        their appointments, consultations, and invoices.
      </p>

      <Modal
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) setEditingPatient(null)
        }}
        title={editingPatient ? 'Edit patient' : 'Register patient'}
        description={
          editingPatient
            ? 'Update the patient contact and demographic record.'
            : 'Create a clinic record for a new patient.'
        }
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditorOpen(false)
                setEditingPatient(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="patient-editor-form"
              isLoading={isSubmitting}
            >
              {editingPatient ? 'Save patient' : 'Register patient'}
            </Button>
          </>
        }
      >
        <form
          id="patient-editor-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <TextField
            label="Full name"
            autoComplete="name"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <TextField
            label="Phone number"
            type="tel"
            autoComplete="tel"
            error={errors.phone?.message}
            required
            {...register('phone')}
          />
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            containerClassName="sm:col-span-2"
            error={errors.email?.message}
            required
            {...register('email')}
          />
          <TextField
            label="Date of birth"
            type="date"
            max={todayISO()}
            error={errors.dob?.message}
            required
            {...register('dob')}
          />
          <SelectField
            label="Gender"
            options={[
              { value: 'Female', label: 'Female' },
              { value: 'Male', label: 'Male' },
              { value: 'Other', label: 'Other' },
            ]}
            error={errors.gender?.message}
            required
            {...register('gender')}
          />
          <TextAreaField
            label="Address"
            containerClassName="sm:col-span-2"
            error={errors.address?.message}
            required
            {...register('address')}
          />
          <p className="caption-5 text-muted sm:col-span-2">
            This creates a clinic record. A demo sign in is not created for
            admin registered patients.
          </p>
        </form>
      </Modal>

      <Modal
        open={patientToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPatientToDelete(null)
        }}
        title={`Remove ${patientToDelete?.name ?? 'this patient'}?`}
        description="This also removes their appointments, consultations, and invoices. This cannot be undone."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPatientToDelete(null)}
            >
              Keep patient
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete}>
              Remove patient
            </Button>
          </>
        }
      >
        <p className="body-6 text-ink/70">
          {patientToDelete
            ? `${patientToDelete.name} has ${
                clinic.getPatientAppointments(patientToDelete.id).length
              } appointments on record.`
            : null}
        </p>
      </Modal>
    </div>
  )
}
