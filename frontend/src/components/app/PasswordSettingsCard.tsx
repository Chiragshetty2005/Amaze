import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LockKey } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { TextField } from '../ui/Form'
import { PasswordStrength } from '../ui/PasswordStrength'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Z]/, 'Add one uppercase letter.')
      .regex(/[a-z]/, 'Add one lowercase letter.')
      .regex(/\d/, 'Add one number.')
      .regex(/[^A-Za-z0-9]/, 'Add one symbol.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

type PasswordValues = z.infer<typeof passwordSchema>

export function PasswordSettingsCard() {
  const { changePassword } = useAuth()
  const [passwordError, setPasswordError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const newPassword = watch('newPassword')

  const onSubmit = (values: PasswordValues) => {
    setPasswordError('')
    const result = changePassword(values.currentPassword, values.newPassword)
    if (!result.ok) {
      setPasswordError(result.message)
      return
    }
    toast.success(result.message)
    reset()
  }

  return (
    <form
      className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex items-center gap-2">
        <LockKey className="h-5 w-5 text-muted" aria-hidden="true" />
        <h2 className="title-1 text-ink">Password and security</h2>
      </div>
      <p className="mt-1 body-6 text-muted">
        Use at least 8 characters with uppercase, lowercase, a number, and a
        symbol.
      </p>

      {passwordError ? (
        <div
          className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 body-6 text-danger"
          role="alert"
        >
          {passwordError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          containerClassName="sm:col-span-2"
          error={errors.currentPassword?.message}
          required
          {...register('currentPassword')}
        />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          required
          {...register('newPassword')}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />
      </div>

      <div className="mt-4">
        <PasswordStrength password={newPassword} />
      </div>

      <div className="mt-5 flex justify-end border-t border-line pt-5">
        <Button type="submit" variant="secondary" isLoading={isSubmitting}>
          Change password
        </Button>
      </div>
    </form>
  )
}
