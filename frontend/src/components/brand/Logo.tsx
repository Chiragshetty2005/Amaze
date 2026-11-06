import { cn } from '../../lib/cn'

interface LogoProps {
  className?: string
  showWordmark?: boolean
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="34"
          height="34"
          rx="10"
          fill="var(--color-primary)"
        />
        <path
          d="M27 3h4a6 6 0 0 1 6 6v4H27z"
          fill="var(--color-mint)"
        />
        <path
          d="m12.5 20.5 5 5 10-10"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-xl font-semibold tracking-tight text-ink">
          AmazeCare
        </span>
      ) : null}
    </span>
  )
}
