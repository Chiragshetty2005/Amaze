import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { Button, buttonStyles } from '../components/ui/Button'
import { TextField } from '../components/ui/Form'
import { PasswordStrength } from '../components/ui/PasswordStrength'

const resetSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .email('Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Z]/, 'Add one uppercase letter.')
      .regex(/[a-z]/, 'Add one lowercase letter.')
      .regex(/\d/, 'Add one number.')
      .regex(/[^A-Za-z0-9]/, 'Add one symbol.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

type ResetValues = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  useDocumentMeta({
    title: 'Choose a new password | AmazeCare',
    description: 'Choose a new password for your AmazeCare account.',
    robots: 'noindex,nofollow',
  })

  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email') ?? ''
  const { resetPassword } = useAuth()
  const [resetEmail, setResetEmail] = useState('')
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: emailParam,
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <WarningCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="heading-3 text-ink">This reset link is not valid.</h1>
          <p className="body-6 text-muted">
            Ask for a fresh link and try again. Reset links expire after 30
            minutes.
          </p>
        </div>
        <Link to="/forgot-password" className={buttonStyles()}>
          Request a new link
        </Link>
        <Link to="/login" className="text-center link text-sm">
          Back to sign in
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-primary">
          <CheckCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="heading-3 text-ink">Password updated.</h1>
          <p className="body-6 text-muted">
            Sign in with your new password. The old one will not work again.
          </p>
        </div>
        <Link
          to={`/login?email=${encodeURIComponent(resetEmail)}`}
          className={buttonStyles()}
        >
          Sign in
        </Link>
      </div>
    )
  }

  const onSubmit = async (values: ResetValues) => {
    clearErrors('root')
    await new Promise((resolve) => setTimeout(resolve, 450))
    const result = resetPassword(values.email, values.password)
    if (!result.ok) {
      setError('root', { message: result.message })
      return
    }
    setResetEmail(values.email)
    toast.success('Password updated. Sign in with the new password.')
    setDone(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="caption-4 text-muted">Password reset</p>
        <h1 className="heading-3 text-ink">Choose a new password.</h1>
        <p className="body-6 text-muted">
          Use at least 8 characters with an uppercase letter, a lowercase
          letter, a number, and a symbol.
        </p>
      </div>

      {errors.root ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 body-6 text-danger"
          role="alert"
        >
          <WarningCircle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>{errors.root.message}</span>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <div className="flex flex-col gap-2">
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            required
            {...register('password')}
          />
          <PasswordStrength password={password} />
        </div>

        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>

      <Link to="/login" className="text-center link text-sm">
        Back to sign in
      </Link>
    </div>
  )
}
