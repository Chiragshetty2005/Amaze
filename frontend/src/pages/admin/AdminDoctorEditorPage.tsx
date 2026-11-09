import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Clock, Stethoscope } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button, buttonStyles } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { TextAreaField, TextField, SelectField } from '../../components/ui/Form'
import { apiErrorMessage } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { formatAvailabilitySummary } from '../../lib/availability'
import type { DoctorAvailability } from '../../types'

const doctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the doctor name.')
    .max(80, 'Keep the name under 80 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9][0-9 ]{7,15}$/,
      'Use digits only, with an optional country code.',
    ),
  specializationId: z.string().min(1, 'Choose a department.'),
  qualification: z
    .string()
    .trim()
    .min(2, 'Enter the qualification.')
    .max(120, 'Keep the qualification under 120 characters.'),
  designation: z
    .string()
    .trim()
    .min(2, 'Enter the designation.')
    .max(120, 'Keep the designation under 120 characters.'),
  experienceYears: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter whole years.')
    .refine(
      (value) => Number(value) >= 0 && Number(value) <= 60,
      'Enter between 0 and 60 years.',
    ),
  fee: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter the fee in whole rupees.')
    .refine(
      (value) => Number(value) >= 0 && Number(value) <= 10000,
      'Enter a fee between 0 and 10,000.',
    ),
  bio: z
    .string()
    .trim()
    .min(20, 'Write at least 20 characters for the profile.')
    .max(600, 'Keep the profile under 600 characters.'),
})

type DoctorValues = z.infer<typeof doctorSchema>

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const defaultAvailability: DoctorAvailability[] = [1, 2, 3, 4, 5].map((day) => ({
  day,
  start: '09:00',
  end: '17:00',
  slotMinutes: 30,
}))

export function AdminDoctorEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const clinic = useClinic()
  const isEdit = Boolean(id)
  const doctor = id ? clinic.getDoctor(id) : undefined

  useDocumentMeta({
    title: isEdit ? 'Edit doctor | AmazeCare Admin' : 'Add doctor | AmazeCare Admin',
    description: 'Manage doctor details, fees, and clinic hours.',
    robots: 'noindex,nofollow',
  })

  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    doctor?.photoUrl,
  )
  const [availability, setAvailability] = useState<DoctorAvailability[]>(
    doctor ? doctor.availability.slice() : defaultAvailability,
  )
  const [availabilityError, setAvailabilityError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DoctorValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: doctor?.name ?? '',
      email: doctor?.email ?? '',
      phone: doctor?.phone ?? '',
      specializationId: doctor?.specializationId ?? '',
      qualification: doctor?.qualification ?? '',
      designation: doctor?.designation ?? '',
      experienceYears: String(doctor?.experienceYears ?? 0),
      fee: String(doctor?.fee ?? 0),
      bio: doctor?.bio ?? '',
    },
  })

  if (isEdit && !doctor) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="Doctor not found"
        description="This doctor may have been removed from the clinic."
        action={
          <Link to="/admin/doctors" className={buttonStyles()}>
            Back to doctors
          </Link>
        }
      />
    )
  }

  const watchedName = watch('name')
  const watchedSpecializationId = watch('specializationId')
  const watchedFee = watch('fee')
  const specialization = watchedSpecializationId
    ? clinic.getSpecialization(watchedSpecializationId)
    : undefined

  const toggleDay = (day: number) => {
    setAvailabilityError('')
    setAvailability((current) => {
      const exists = current.some((slot) => slot.day === day)
      if (exists) return current.filter((slot) => slot.day !== day)
      return [
        ...current,
        { day, start: '09:00', end: '17:00', slotMinutes: 30 },
      ]
    })
  }

  const updateDay = (day: number, patch: Partial<DoctorAvailability>) => {
    setAvailabilityError('')
    setAvailability((current) =>
      current.map((slot) => (slot.day === day ? { ...slot, ...patch } : slot)),
    )
  }

  const onSubmit = async (values: DoctorValues) => {
    const sortedAvailability = availability
      .slice()
      .sort((a, b) => a.day - b.day)

    if (sortedAvailability.length === 0) {
      setAvailabilityError('Choose at least one clinic day.')
      return
    }
    const invalid = sortedAvailability.find((slot) => slot.start >= slot.end)
    if (invalid) {
      setAvailabilityError(
        `${dayNames[invalid.day]} has an end time that is not after the start time.`,
      )
      return
    }
    setAvailabilityError('')

    const payload = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      specializationId: values.specializationId,
      experienceYears: Number(values.experienceYears),
      qualification: values.qualification.trim(),
      designation: values.designation.trim(),
      fee: Number(values.fee),
      bio: values.bio.trim(),
      photoUrl,
      availability: sortedAvailability,
    }

    try {
      if (doctor) {
        await clinic.updateDoctor(doctor.id, payload)
        toast.success('Doctor profile updated.')
      } else {
        const result = await clinic.addDoctor(payload)
        toast.success(
          result.invitationSent
            ? 'Doctor added. An account invitation was sent by email.'
            : 'Doctor added to the clinic.',
        )
      }
      navigate('/admin/doctors')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/doctors"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to doctors
        </Link>
      </div>

      <PageHeader
        title={isEdit ? 'Edit doctor' : 'Add doctor'}
        description={
          isEdit
            ? `Update the profile and clinic hours for ${doctor?.name}.`
            : 'Add a new doctor to the clinic directory and appointment booking.'
        }
      />

      <form
        className="flex flex-col gap-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="title-1 text-ink">Profile details</h2>
              <p className="mt-1 body-6 text-muted">
                These details appear in search, booking, and the doctor profile.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Full name"
                  autoComplete="name"
                  error={errors.name?.message}
                  required
                  {...register('name')}
                />
                <TextField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  hint="Used for appointment notifications."
                  error={errors.email?.message}
                  required
                  {...register('email')}
                />
                <TextField
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                  error={errors.phone?.message}
                  required
                  {...register('phone')}
                />
                <SelectField
                  label="Department"
                  placeholder="Choose a department"
                  options={clinic.state.specializations
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => ({ value: item.id, label: item.name }))}
                  error={errors.specializationId?.message}
                  required
                  {...register('specializationId')}
                />
                <TextField
                  label="Qualification"
                  placeholder="MBBS, MD"
                  error={errors.qualification?.message}
                  required
                  {...register('qualification')}
                />
                <TextField
                  label="Designation"
                  placeholder="Consultant, Senior Consultant"
                  error={errors.designation?.message}
                  required
                  {...register('designation')}
                />
                <TextField
                  label="Experience (years)"
                  type="number"
                  min={0}
                  max={60}
                  inputMode="numeric"
                  error={errors.experienceYears?.message}
                  required
                  {...register('experienceYears')}
                />
                <TextField
                  label="Consultation fee (INR)"
                  type="number"
                  min={0}
                  max={10000}
                  inputMode="numeric"
                  error={errors.fee?.message}
                  required
                  {...register('fee')}
                />
                <TextAreaField
                  label="Profile"
                  containerClassName="sm:col-span-2"
                  hint="A short public biography."
                  error={errors.bio?.message}
                  required
                  {...register('bio')}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="title-1 text-ink">Clinic hours</h2>
                  <p className="mt-1 body-6 text-muted">
                    Set the days, hours, and slot length used for booking.
                  </p>
                </div>
              </div>

              {availabilityError ? (
                <div
                  className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 body-6 text-danger"
                  role="alert"
                >
                  {availabilityError}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col divide-y divide-line rounded-xl border border-line">
                {dayNames.map((dayName, day) => {
                  const slot = availability.find((item) => item.day === day)
                  return (
                    <div
                      key={dayName}
                      className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
                    >
                      <label className="flex min-w-36 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(slot)}
                          onChange={() => toggleDay(day)}
                          className="h-4 w-4 rounded border-line accent-primary"
                        />
                        <span className="body-6 text-ink">{dayName}</span>
                      </label>
                      {slot ? (
                        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                          <label className="flex flex-col gap-1">
                            <span className="caption-5 text-muted">From</span>
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(event) =>
                                updateDay(day, { start: event.target.value })
                              }
                              className="input"
                              aria-label={`${dayName} start time`}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="caption-5 text-muted">To</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(event) =>
                                updateDay(day, { end: event.target.value })
                              }
                              className="input"
                              aria-label={`${dayName} end time`}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="caption-5 text-muted">
                              Slot length
                            </span>
                            <select
                              value={slot.slotMinutes}
                              onChange={(event) =>
                                updateDay(day, {
                                  slotMinutes: Number(event.target.value),
                                })
                              }
                              className="input"
                              aria-label={`${dayName} slot length`}
                            >
                              {[15, 20, 30, 45, 60].map((minutes) => (
                                <option key={minutes} value={minutes}>
                                  {minutes} min
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <p className="flex-1 body-6 text-muted">
                          Closed for appointments.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="title-1 text-ink">Profile photo</h2>
              <div className="mt-4">
                <FileUpload
                  label="Photo"
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  onError={(message) => toast.error(message)}
                />
              </div>
            </section>

            <section className="card-flat">
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar
                  name={watchedName || 'New doctor'}
                  photoUrl={photoUrl}
                  size="xl"
                  className="ring-4 ring-surface"
                />
                <div>
                  <p className="heading-5 text-ink">
                    {watchedName || 'New doctor'}
                  </p>
                  <p className="caption-4 text-ink/70">
                    {specialization?.name ?? 'Department not set'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-primary/15 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="caption-5 text-ink/70">Fee</span>
                  <span className="font-mono text-sm text-ink">
                    {formatCurrency(Number(watchedFee) || 0)}
                  </span>
                </div>
                <p className="caption-5 text-ink/70">
                  {formatAvailabilitySummary(availability)}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="title-1 text-ink">Email and sign in</h2>
              <p className="mt-2 body-6 text-muted">
                The email is the profile contact. Demo sign in accounts are
                fixed, so a newly added doctor is a clinic record rather than a
                new login.
              </p>
            </section>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
          <Link
            to="/admin/doctors"
            className={buttonStyles({ variant: 'ghost' })}
          >
            Cancel
          </Link>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save doctor' : 'Add doctor'}
          </Button>
        </div>
      </form>
    </div>
  )
}
