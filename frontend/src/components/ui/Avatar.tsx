import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface AvatarProps {
  name: string
  photoUrl?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({
  name,
  photoUrl,
  size = 'md',
  className,
}: AvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          'shrink-0 rounded-full object-cover',
          sizeClasses[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-mint font-semibold text-primary',
        sizeClasses[size],
        className,
      )}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ children }: { children: ReactNode }) {
  return <div className="flex items-center -space-x-2">{children}</div>
}
