const DAY_MS = 86_400_000

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDaysISO(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateShort(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parseISODate(value))
}

export function formatDateLong(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(value))
}

export function formatDateNumeric(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseISODate(value))
}

export function formatWeekday(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(
    parseISODate(value),
  )
}

export function formatDayNumber(value: string): string {
  return String(parseISODate(value).getDate())
}

export function formatMonthShort(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(
    parseISODate(value),
  )
}

export function relativeDayLabel(value: string): string {
  const today = todayISO()
  if (value === today) return 'Today'
  if (value === addDaysISO(1)) return 'Tomorrow'
  return formatDateShort(value)
}

export function formatTime(value: string): string {
  const [hour, minute] = value.split(':').map(Number)
  const suffix = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function formatTimeRange(start: string, minutes: number): string {
  const [hour, minute] = start.split(':').map(Number)
  const total = hour * 60 + minute + minutes
  const endHour = Math.floor(total / 60) % 24
  const endMinute = total % 60
  return `${formatTime(start)} to ${formatTime(
    `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
  )}`
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export function minutesToTime(value: number): string {
  const hour = Math.floor(value / 60)
  const minute = value % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function generateTimeSlots(
  start: string,
  end: string,
  slotMinutes: number,
): string[] {
  const slots: string[] = []
  for (
    let current = timeToMinutes(start);
    current + slotMinutes <= timeToMinutes(end);
    current += slotMinutes
  ) {
    slots.push(minutesToTime(current))
  }
  return slots
}

export function isPastSlot(date: string, time: string): boolean {
  const today = todayISO()
  if (date < today) return true
  if (date > today) return false
  const now = new Date()
  return timeToMinutes(time) <= now.getHours() * 60 + now.getMinutes()
}

export function getNextDays(count: number, from = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(from)
    date.setDate(date.getDate() + index)
    return toISODate(date)
  })
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS,
  )
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function formatDateTimeLong(date: string, time: string): string {
  return `${formatDateShort(date)} at ${formatTime(time)}`
}
