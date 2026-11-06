import { CalendarX } from '@phosphor-icons/react'
import {
  formatDateLong,
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
} from '../../lib/date'
import { cn } from '../../lib/cn'

interface SlotPickerProps {
  dates: string[]
  date: string
  onDateChange: (date: string) => void
  slots: string[]
  time: string
  onTimeChange: (time: string) => void
  disabledSlots?: Set<string>
  availableDates?: Set<string>
  emptyMessage?: string
}

export function SlotPicker({
  dates,
  date,
  onDateChange,
  slots,
  time,
  onTimeChange,
  disabledSlots = new Set<string>(),
  availableDates,
  emptyMessage = 'No slots are open on this day. Choose another date.',
}: SlotPickerProps) {
  const hasAvailability = !availableDates || availableDates.size > 0
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="label">Choose a date</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dates.map((item) => {
            const selected = item === date
            const disabled =
              hasAvailability && availableDates
                ? !availableDates.has(item)
                : false
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={formatDateLong(item)}
                onClick={() => onDateChange(item)}
                className={cn(
                  'flex min-w-16 flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors duration-300 ease-out-expo',
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-line bg-surface text-ink hover:bg-mint',
                  disabled &&
                    'cursor-not-allowed border-line bg-paper text-muted opacity-50 hover:bg-paper',
                )}
              >
                <span
                  className={cn(
                    'caption-5',
                    selected ? 'text-white/80' : 'text-muted',
                  )}
                >
                  {formatWeekday(item)}
                </span>
                <span className="title-2">{formatDayNumber(item)}</span>
                <span
                  className={cn(
                    'caption-5',
                    selected ? 'text-white/80' : 'text-muted',
                  )}
                >
                  {formatMonthShort(item)}
                </span>
              </button>
            )
          })}
        </div>
        {dates.length > 4 ? (
          <p className="caption-5 text-muted">Scroll for more dates.</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="label">Choose a time</p>
        {slots.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3">
            <CalendarX
              className="h-5 w-5 shrink-0 text-muted"
              aria-hidden="true"
            />
            <p className="body-6 text-muted">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {slots.map((slot) => {
              const disabled = disabledSlots.has(slot)
              const selected = slot === time
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${formatTime(slot)} on ${formatDateLong(date)}`}
                  onClick={() => onTimeChange(slot)}
                  className={cn(
                    'rounded-lg border px-3 py-2 font-mono text-sm transition-colors duration-300 ease-out-expo',
                    selected
                      ? 'border-primary bg-primary text-white'
                      : 'border-line bg-surface text-ink hover:bg-mint',
                    disabled &&
                      'cursor-not-allowed border-line bg-paper text-muted opacity-50 hover:bg-paper',
                  )}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
