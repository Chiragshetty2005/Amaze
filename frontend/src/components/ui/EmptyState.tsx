import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint text-primary">
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <p className="title-2 text-ink">{title}</p>
        <p className="body-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
