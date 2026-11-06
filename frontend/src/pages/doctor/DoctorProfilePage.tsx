import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Clock,
  EnvelopeSimple,
  Phone,
  Stethoscope,
  UserCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { TextAreaField, TextField } from '../../components/ui/Form'
import { PasswordSettingsCard } from '../../components/app/PasswordSettingsCard'
import { formatAvailabilitySummary } from '../../lib/availability'
import { formatCurrency } from '../../lib/format'
import { formatTime } from '../../lib/date'

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .max(80, 'Keep your name under 80 characters.'),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9][0-9 ]{7,15}$/,
      'Use digits only, with an optional country code.',
    ),
  qualification: z
    .string()
    .trim()
    .min(2, 'Enter your qualification.')
    .max(120, 'Keep the qualification under 120 characters.'),
  designation: z
    .string()
    .trim()
    .min(2, 'Enter your designation.')
    .max(120, 'Keep the designation under 120 characters.'),
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
    .min(20, 'Write at least 20 characters for your profile.')
    .max(600, 'Keep the profile under 600 characters.'),
})

type ProfileValues = z.infer<typeof profileSchema>

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function DoctorProfilePage() {
  useDocumentMeta({
    title: 'Profile | AmazeCare Doctor',
    description: 'Update your public profile, photo, and password.',
    robots: 'noindex,nofollow',
  })

  const { user, updateProfile } = useAuth()
  const clinic = useClinic()
  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)
  const specialization = doctor
    ? clinic.getSpecialization(doctor.specializationId)
    : undefined
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    doctor?.photoUrl ?? user?.photoUrl,
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: doctor?.name ?? user?.name ?? '',
      phone: doctor?.phone ?? user?.phone ?? '',
      qualification: doctor?.qualification ?? '',
      designation: doctor?.designation ?? '',
      fee: String(doctor?.fee ?? 0),
      bio: doctor?.bio ?? '',
    },
  })

  if (!user || !doctor) {
    return (
      <EmptyState
        icon={<UserCircle className="h-6 w-6" aria-hidden="true" />}
        title="Profile not found"
        description="The doctor record for this sign in could not be found."
      />
    )
  }

  const onSave = async (values: ProfileValues) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    updateProfile({
      name: values.name,
      phone: values.phone,
      photoUrl,
    })
    clinic.updateDoctor(doctor.id, {
      name: values.name,
      phone: values.phone,
      photoUrl,
      qualification: values.qualification,
      designation: values.designation,
      fee: Number(values.fee),
      bio: values.bio.trim(),
    })
    toast.success('Profile updated.')
  }

  const sortedAvailability = doctor.availability
    .slice()
    .sort((a, b) => a.day - b.day)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Your public profile, clinic hours, and account security."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="flex flex-col gap-4 lg:col-span-1">
          <div className="card-flat flex flex-col items-center gap-3 text-center">
            <Avatar
              name={doctor.name}
              photoUrl={photoUrl}
              size="xl"
              className="ring-4 ring-surface"
            />
            <div className="flex flex-col gap-1">
              <p className="heading-5 text-ink">{doctor.name}</p>
              <p className="caption-4 text-ink/60">
                {specialization?.name ?? doctor.designation}
              </p>
            </div>
            <div className="flex w-full flex-col gap-1 border-t border-primary/15 pt-3">
              <p className="caption-5 text-ink/60">
                {doctor.experienceYears} years of experience
              </p>
              <p className="caption-5 text-ink/60">
                Consultation fee{' '}
                <span className="font-mono text-ink">
                  {formatCurrency(doctor.fee)}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Contact</h2>
            <div className="mt-3 flex flex-col gap-3">
              <a
                href={`mailto:${doctor.email}`}
                className="flex items-start gap-2 body-6 break-all text-ink hover:text-primary"
              >
                <EnvelopeSimple
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {doctor.email}
              </a>
              <a
                href={`tel:${doctor.phone.replace(/\s/g, '')}`}
                className="flex items-start gap-2 body-6 text-ink hover:text-primary"
              >
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {doctor.phone}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted" aria-hidden="true" />
              <h2 className="title-1 text-ink">Clinic hours</h2>
            </div>
            <p className="mt-2 body-6 text-muted">
              {formatAvailabilitySummary(doctor.availability)}
            </p>
            <ul className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {sortedAvailability.map((slot) => (
                <li
                  key={slot.day}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="body-6 text-ink">{dayNames[slot.day]}</span>
                  <span className="font-mono text-xs text-muted">
                    {formatTime(slot.start)} to {formatTime(slot.end)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 caption-5 text-muted">
              Clinic hours are managed by the administrator.
            </p>
          </div>
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <form
            className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
            onSubmit={handleSubmit(onSave)}
            noValidate
          >
            <div className="flex flex-col gap-1">
              <h2 className="title-1 text-ink">Profile details</h2>
              <p className="body-6 text-muted">
                This information appears on your public profile and appointment
                confirmations.
              </p>
            </div>

            <div className="mt-5">
              <FileUpload
                label="Profile photo"
                value={photoUrl}
                onChange={setPhotoUrl}
                onError={(message) => toast.error(message)}
              />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                value={doctor.email}
                disabled
                hint="Sign in email cannot be changed in this demo."
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
              <TextField
                label="Qualification"
                error={errors.qualification?.message}
                required
                {...register('qualification')}
              />
              <TextField
                label="Designation"
                error={errors.designation?.message}
                required
                {...register('designation')}
              />
              <TextAreaField
                label="Profile"
                containerClassName="sm:col-span-2"
                hint="Patients see this on your profile."
                error={errors.bio?.message}
                required
                {...register('bio')}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="caption-5 text-muted">
                <Stethoscope
                  className="mr-1 inline h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Public profile updates immediately.
              </p>
              <Button type="submit" isLoading={isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>

          <PasswordSettingsCard />
        </div>
      </div>
    </div>
  )
}
