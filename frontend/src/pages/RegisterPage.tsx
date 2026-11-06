import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { WarningCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { Button } from '../components/ui/Button'
import {
  SelectField,
  TextAreaField,
  TextField,
} from '../components/ui/Form'
import { PasswordStrength } from '../components/ui/PasswordStrength'
import { todayISO, parseISODate } from '../lib/date'
import { resolvePostLoginPath } from '../lib/auth'
import type { Gender } from '../types'

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(80, 'Keep your name under 80 characters.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Enter your email address.')
      .email('Enter a valid email address.'),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+?[0-9][0-9 ]{7,15}$/,
        'Use digits only, with an optional country code.',
      ),
    dob: z
      .string()
      .min(1, 'Choose your date of birth.')
      .refine((value) => {
        const date = parseISODate(value)
        return (
          !Number.isNaN(date.getTime()) &&
          date <= new Date() &&
          date >= new Date(1900, 0, 1)
        )
      }, 'Enter a valid date of birth.'),
    gender: z.string().min(1, 'Choose an option.'),
    address: z
      .string()
      .trim()
      .min(5, 'Enter your address.')
      .max(200, 'Keep your address under 200 characters.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[A-Z]/, 'Add one uppercase letter.')
      .regex(/[a-z]/, 'Add one lowercase letter.')
      .regex(/\d/, 'Add one number.')
      .regex(/[^A-Za-z0-9]/, 'Add one symbol.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    terms: z.boolean().refine((value) => value, {
      message: 'Accept the terms to continue.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  useDocumentMeta({
    title: 'Create a patient account | AmazeCare',
    description:
      'Create one account for appointments, prescriptions, test results, and bills at AmazeCare.',
    robots: 'noindex,nofollow',
  })

  const { user, registerPatient } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      dob: '',
      gender: '',
      address: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  })

  const password = watch('password')

  useEffect(() => {
    if (user) {
      navigate(resolvePostLoginPath(user.role, redirect), { replace: true })
    }
  }, [user, redirect, navigate])

  const onSubmit = async (values: RegisterValues) => {
    clearErrors('root')
    await new Promise((resolve) => setTimeout(resolve, 450))
    const result = registerPatient({
      name: values.name,
      email: values.email,
      phone: values.phone,
      dob: values.dob,
      gender: values.gender as Gender,
      address: values.address,
      password: values.password,
    })

    if (!result.ok) {
      setError('root', { message: result.message })
      return
    }

    toast.success(result.message)
    const loginParams = new URLSearchParams({
      email: values.email,
      registered: '1',
    })
    if (redirect) loginParams.set('redirect', redirect)
    navigate(`/login?${loginParams.toString()}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="caption-4 text-muted">New patient</p>
        <h1 className="heading-3 text-ink">Create your patient account.</h1>
        <p className="body-6 text-muted">
          One account for appointments, records, and bills.
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
        className="flex flex-col gap-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <fieldset className="flex flex-col gap-4">
          <legend className="title-2 text-ink">Your details</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              autoComplete="name"
              placeholder="Priya Nair"
              error={errors.name?.message}
              required
              {...register('name')}
            />
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
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              error={errors.phone?.message}
              hint="Use the number your clinic can reach."
              required
              {...register('phone')}
            />
            <TextField
              label="Date of birth"
              type="date"
              autoComplete="bday"
              max={todayISO()}
              error={errors.dob?.message}
              required
              {...register('dob')}
            />
            <SelectField
              label="Gender"
              placeholder="Choose an option"
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
              autoComplete="street-address"
              placeholder="House number, street, city, and PIN code"
              containerClassName="sm:col-span-2"
              error={errors.address?.message}
              required
              {...register('address')}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4 border-t border-line pt-6">
          <legend className="title-2 text-ink">Secure your account</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              required
              {...register('password')}
            />
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              required
              {...register('confirmPassword')}
            />
          </div>
          <PasswordStrength password={password} />
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-3 body-6 text-muted">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-primary"
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'terms-error' : undefined}
              {...register('terms')}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="link text-sm">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="link text-sm">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.terms ? (
            <p className="field-error" id="terms-error" role="alert">
              {errors.terms.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center body-6 text-muted">
        Already have an account?{' '}
        <Link
          to={
            redirect
              ? `/login?redirect=${encodeURIComponent(redirect)}`
              : '/login'
          }
          className="link text-sm"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
