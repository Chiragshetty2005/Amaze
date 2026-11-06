import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { cn } from '../../lib/cn'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel = 'Search',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <MagnifyingGlass
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="input pl-10 pr-10"
      />
      {value ? (
        <button
          type="button"
          className="icon-btn absolute right-1 top-1/2 -translate-y-1/2 text-muted hover:bg-mint hover:text-ink"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
