import type { DoctorAvailability } from '../types'
import { formatTime } from './date'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatAvailabilitySummary(
  availability: DoctorAvailability[],
): string {
  if (availability.length === 0) return 'No clinic hours set.'
  const days = availability
    .map((item) => item.day)
    .slice()
    .sort((a, b) => a - b)
  const contiguous = days.every(
    (day, index) => index === 0 || day === days[index - 1] + 1,
  )
  const dayLabel = contiguous
    ? `${dayNames[days[0]]} to ${dayNames[days[days.length - 1]]}`
    : days.map((day) => dayNames[day]).join(', ')
  const first = availability[0]
  const uniformHours = availability.every(
    (item) => item.start === first.start && item.end === first.end,
  )
  const hours = uniformHours
    ? `${formatTime(first.start)} to ${formatTime(first.end)}`
    : 'Varying hours'
  return `${dayLabel}. ${hours}. ${first.slotMinutes} minute slots.`
}

export function formatAvailabilityDays(availability: DoctorAvailability[]): string {
  return availability
    .map((item) => item.day)
    .slice()
    .sort((a, b) => a - b)
    .map((day) => dayNames[day])
    .join(', ')
}
