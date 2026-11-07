import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { TextField } from '../../components/ui/Form'
import { PasswordSettingsCard } from '../../components/app/PasswordSettingsCard'
import { apiErrorMessage } from '../../lib/api'
import { getAge } from '../../lib/format'
import { formatDateLong } from '../../lib/date'

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
  address: z
    .string()
    .trim()
    .min(5, 'Enter your address.')
    .max(200, 'Keep your address under 200 characters.'),
})

type ProfileValues = z.infer<typeof profileSchema>

export function PatientProfilePage() {
  useDocumentMeta({
    title: 'Profile | AmazeCare',
    description: 'Update your contact details, photo, and password.',
    robots: 'noindex,nofollow',
  })

  const { user, updateProfile } = useAuth()
  const clinic = useClinic()
  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(user?.photoUrl)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: patient?.name ?? user?.name ?? '',
      phone: patient?.phone ?? user?.phone ?? '',
      address: patient?.address ?? '',
    },
  })

  if (!user || !patient) {
    return (
      <EmptyState
        icon={<UserCircle className="h-6 w-6" aria-hidden="true" />}
        title="Profile not found"
        description="The patient record for this sign in could not be found."
      />
    )
  }

  const onSaveProfile = async (values: ProfileValues) => {
    try {
      await clinic.updatePatient(patient.id, {
        name: values.name,
        phone: values.phone,
        address: values.address,
      })
      const result = await updateProfile({
        name: values.name,
        phone: values.phone,
        photoUrl,
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Profile updated.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Keep your contact details current so the clinic can reach you."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="flex flex-col gap-4 lg:col-span-1">
          <div className="card-flat flex flex-col items-center gap-3 text-center">
            <Avatar
              name={patient.name}
              photoUrl={photoUrl}
              size="xl"
              className="ring-4 ring-surface"
            />
            <div className="flex flex-col gap-1">
              <p className="heading-5 text-ink">{patient.name}</p>
              <p className="caption-4 text-ink/70">Patient</p>
            </div>
            <div className="flex w-full flex-col gap-1 border-t border-primary/15 pt-3">
              <p className="caption-5 text-ink/70">
                Patient ID{' '}
                <span className="font-mono text-ink">
                  {patient.id.toUpperCase()}
                </span>
              </p>
              <p className="caption-5 text-ink/70">
                {getAge(patient.dob)} years. {patient.gender}.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Contact</h2>
            <dl className="mt-3 flex flex-col gap-3">
              <div>
                <dt className="caption-5 text-muted">Email</dt>
                <dd className="body-6 break-all text-ink">{patient.email}</dd>
              </div>
              <div>
                <dt className="caption-5 text-muted">Phone</dt>
                <dd className="body-6 text-ink">{patient.phone}</dd>
              </div>
              <div>
                <dt className="caption-5 text-muted">Date of birth</dt>
                <dd className="body-6 text-ink">
                  {formatDateLong(patient.dob)}
                </dd>
              </div>
              <div>
                <dt className="caption-5 text-muted">Address</dt>
                <dd className="body-6 text-ink">{patient.address}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <form
            className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
            onSubmit={handleSubmit(onSaveProfile)}
            noValidate
          >
            <div className="flex flex-col gap-1">
              <h2 className="title-1 text-ink">Profile details</h2>
              <p className="body-6 text-muted">
                Your name and phone appear on appointment confirmations.
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
                value={patient.email}
                disabled
                hint="Contact the clinic to change your sign-in email."
              />
              <div className="flex flex-col gap-2">
                <span className="label">Date of birth</span>
                <div className="input bg-paper text-muted">
                  {formatDateLong(patient.dob)}
                </div>
              </div>
              <TextField
                label="Address"
                autoComplete="street-address"
                containerClassName="sm:col-span-2"
                error={errors.address?.message}
                required
                {...register('address')}
              />
            </div>

            <div className="mt-5 flex justify-end border-t border-line pt-5">
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
