import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/Form'

const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
})

type ForgotValues = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  useDocumentMeta({
    title: 'Reset your password | AmazeCare',
    description: 'Request a password reset link for your AmazeCare account.',
    robots: 'noindex,nofollow',
  })

  const { requestPasswordReset } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotValues) => {
    clearErrors('root')
    const result = await requestPasswordReset(values.email)
    if (!result.ok) {
      setError('root', { message: result.message })
      return
    }
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-primary">
          <EnvelopeSimple className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="heading-3 text-ink">Check your inbox.</h1>
          <p className="body-6 text-muted">
            If an account exists for{' '}
            <span className="font-medium text-ink">{sentTo}</span>, a reset
            link is on its way. It expires in 30 minutes.
          </p>
        </div>

        <div className="card-flat">
          <p className="title-3 text-ink">No email yet?</p>
          <p className="mt-1 body-6 text-ink/70">
            Check your spam folder, or try another address.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setSentTo(null)}
          >
            Try another email
          </Button>
          <Link to="/login" className="text-center link text-sm">
            Back to sign in
          </Link>
        </div>

      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="caption-4 text-muted">Password help</p>
        <h1 className="heading-3 text-ink">Reset your password.</h1>
        <p className="body-6 text-muted">
          Enter the email on your account. We will send a link to choose a new
          password.
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

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <Link to="/login" className="text-center link text-sm">
        Back to sign in
      </Link>
    </div>
  )
}
