import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Buildings,
  EnvelopeSimple,
  Phone,
  UserCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { TextField } from '../../components/ui/Form'
import { PasswordSettingsCard } from '../../components/app/PasswordSettingsCard'

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
})

type ProfileValues = z.infer<typeof profileSchema>

export function AdminProfilePage() {
  useDocumentMeta({
    title: 'Profile | AmazeCare Admin',
    description: 'Manage your administrator profile and password.',
    robots: 'noindex,nofollow',
  })

  const { user, updateProfile } = useAuth()
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(user?.photoUrl)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
    },
  })

  if (!user) {
    return (
      <EmptyState
        icon={<UserCircle className="h-6 w-6" aria-hidden="true" />}
        title="Profile not found"
        description="Sign in again to manage your administrator profile."
      />
    )
  }

  const onSave = async (values: ProfileValues) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    updateProfile({
      name: values.name,
      phone: values.phone,
      photoUrl,
    })
    toast.success('Profile updated.')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Your administrator identity, clinic details, and account security."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="flex flex-col gap-4">
          <div className="card-flat flex flex-col items-center gap-3 text-center">
            <Avatar
              name={user.name}
              photoUrl={photoUrl}
              size="xl"
              className="ring-4 ring-surface"
            />
            <div>
              <p className="heading-5 text-ink">{user.name}</p>
              <p className="caption-4 text-ink/70">Clinic administrator</p>
            </div>
            <p className="border-t border-primary/15 pt-3 caption-5 text-ink/70">
              Full access to schedules, records, catalog, billing, and reports.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <Buildings className="h-5 w-5 text-muted" aria-hidden="true" />
              <h2 className="title-1 text-ink">Clinic details</h2>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <p className="body-5 text-ink">
                AmazeCare Clinic
                <span className="mt-0.5 block caption-5 text-muted">
                  4th Floor, 12th Main Road, Indiranagar
                  <br />
                  Bengaluru 560038
                </span>
              </p>
              <p className="flex items-center gap-2 body-6 text-ink">
                <Phone className="h-4 w-4 text-muted" aria-hidden="true" />
                +91 80 4123 8800
              </p>
              <p className="flex items-center gap-2 body-6 text-ink">
                <EnvelopeSimple
                  className="h-4 w-4 text-muted"
                  aria-hidden="true"
                />
                care@amazecare.test
              </p>
            </div>
            <p className="mt-3 border-t border-line pt-3 caption-5 text-muted">
              Clinic details are fixed in this demo.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Sign in</h2>
            <p className="mt-2 body-6 break-all text-ink">{user.email}</p>
            <p className="mt-1 caption-5 text-muted">
              Administrator account. Email changes are not enabled in this demo.
            </p>
          </div>
        </aside>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <form
            className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
            onSubmit={handleSubmit(onSave)}
            noValidate
          >
            <h2 className="title-1 text-ink">Profile details</h2>
            <p className="mt-1 body-6 text-muted">
              This name and photo appear in the workspace header.
            </p>

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
                value={user.email}
                disabled
                containerClassName="sm:col-span-2"
                hint="Sign in email cannot be changed in this demo."
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
