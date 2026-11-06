import { CheckCircle, Circle } from '@phosphor-icons/react'
import { getPasswordStrength } from '../../lib/password'
import { cn } from '../../lib/cn'

const barColor = [
  'bg-line',
  'bg-danger',
  'bg-warning',
  'bg-primary',
  'bg-success',
]

export function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  const activeColor = barColor[strength.score]

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 gap-2">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors duration-300 ease-out-expo',
                strength.score >= step ? activeColor : 'bg-line',
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            'caption-4',
            strength.score >= 3
              ? 'text-success'
              : strength.score === 2
                ? 'text-warning'
                : 'text-danger',
          )}
        >
          {strength.label}
        </span>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {strength.checks.map((check) => (
          <li
            key={check.label}
            className={cn(
              'flex items-center gap-2 caption-5',
              check.passed ? 'text-success' : 'text-muted',
            )}
          >
            {check.passed ? (
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4" aria-hidden="true" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
