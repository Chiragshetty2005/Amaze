import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { Button, buttonStyles } from '../components/ui/Button'
import { TextField } from '../components/ui/Form'
import { demoAccounts } from '../mocks/data'
import { resolvePostLoginPath } from '../lib/auth'

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  useDocumentMeta({
    title: 'Sign in | AmazeCare',
    description: 'Sign in to manage appointments, records, and bills.',
    robots: 'noindex,nofollow',
  })

  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const emailParam = searchParams.get('email') ?? ''
  const registered = searchParams.get('registered') === '1'
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailParam, password: '' },
  })

  useEffect(() => {
    if (user) {
      navigate(resolvePostLoginPath(user.role, redirect), { replace: true })
    }
  }, [user, redirect, navigate])

  const onSubmit = (values: LoginValues) => {
    clearErrors('root')
    const result = login(values.email, values.password)
    if (!result.ok) {
      setError('root', { message: result.message })
      return
    }
    toast.success(result.message)
  }

  const signInWithDemo = (account: (typeof demoAccounts)[number]) => {
    clearErrors('root')
    setValue('email', account.email)
    setValue('password', account.password)
    const result = login(account.email, account.password)
    if (!result.ok) {
      setError('root', { message: result.message })
      return
    }
    toast.success(result.message)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="caption-4 text-muted">Welcome back</p>
        <h1 className="heading-3 text-ink">Sign in to AmazeCare.</h1>
        <p className="body-6 text-muted">
          Your appointments, prescriptions, and bills are waiting.
        </p>
      </div>

      {registered ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-3 body-6 text-success">
          Account created. Sign in with your new password to continue.
        </div>
      ) : null}

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

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          required
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="icon-btn text-muted hover:bg-mint hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeSlash className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
          {...register('password')}
        />

        <div className="-mt-2 flex justify-end">
          <Link to="/forgot-password" className="link text-sm">
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center body-6 text-muted">
        New patient?{' '}
        <Link
          to={
            redirect
              ? `/register?redirect=${encodeURIComponent(redirect)}`
              : '/register'
          }
          className="link text-sm"
        >
          Create an account
        </Link>
      </p>

      <div className="border-t border-line pt-5">
        <p className="caption-4 text-muted">Or use a demo account</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => signInWithDemo(account)}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              {account.label} demo
            </button>
          ))}
        </div>
        <p className="mt-3 caption-5 text-muted">
          One click signs you in. No real patient data is stored.
        </p>
      </div>
    </div>
  )
}
