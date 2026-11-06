import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SectionIntroProps {
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
  action?: ReactNode
}

export function SectionIntro({
  title,
  description,
  align = 'left',
  className,
  action,
}: SectionIntroProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      <h2 className="heading-section max-w-2xl text-ink">{title}</h2>
      {description ? (
        <p className="max-w-hero body-3 text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  )
}
