import {
  createContext,
  useContext,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'

type TabsMode = 'tabs' | 'filter'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  mode: TabsMode
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used inside Tabs')
  }
  return context
}

export function Tabs({
  value,
  defaultValue = '',
  onValueChange,
  mode = 'tabs',
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  mode?: TabsMode
  children: ReactNode
}) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const baseId = useId()
  const activeValue = value ?? internalValue

  const setValue = (next: string) => {
    if (value === undefined) {
      setInternalValue(next)
    }
    onValueChange?.(next)
  }

  return (
    <TabsContext.Provider
      value={{ value: activeValue, setValue, mode, baseId }}
    >
      {children}
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  const context = useTabsContext()

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (context.mode !== 'tabs') return

    const target = event.target
    if (!(target instanceof HTMLButtonElement)) return
    if (target.getAttribute('role') !== 'tab') return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return
    }

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    )
    if (tabs.length === 0) return

    const currentIndex = tabs.indexOf(target)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowLeft'
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length

    event.preventDefault()
    tabs[nextIndex].focus()
    const nextValue = tabs[nextIndex].dataset.value
    if (nextValue) context.setValue(nextValue)
  }

  return (
    <div
      role={context.mode === 'filter' ? 'group' : 'tablist'}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'no-scrollbar flex w-full gap-1 overflow-x-auto rounded-lg bg-paper p-1 sm:w-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const context = useTabsContext()
  const active = context.value === value
  const filterMode = context.mode === 'filter'

  return (
    <button
      type="button"
      role={filterMode ? undefined : 'tab'}
      id={filterMode ? undefined : `${context.baseId}-tab-${value}`}
      aria-selected={filterMode ? undefined : active}
      aria-controls={
        filterMode ? undefined : `${context.baseId}-panel-${value}`
      }
      aria-pressed={filterMode ? active : undefined}
      tabIndex={filterMode || active ? 0 : -1}
      data-value={value}
      onClick={() => context.setValue(value)}
      className={cn(
        'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300 ease-out-expo',
        active ? 'bg-surface text-ink' : 'text-muted hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const context = useTabsContext()
  const active = context.value === value

  return (
    <div
      role="tabpanel"
      id={`${context.baseId}-panel-${value}`}
      aria-labelledby={`${context.baseId}-tab-${value}`}
      hidden={!active}
      className={cn('mt-4 focus-visible:outline-none', className)}
    >
      {children}
    </div>
  )
}
