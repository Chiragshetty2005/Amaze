import type { Appointment, Doctor } from '../types'
import {
  formatDateShort,
  formatTime,
  generateTimeSlots,
  getNextDays,
  isPastSlot,
  parseISODate,
  relativeDayLabel,
} from './date'

export interface AvailableSlot {
  date: string
  time: string
}

export function getAvailableSlotsForDoctor(
  doctor: Doctor,
  date: string,
  appointments: Appointment[],
): string[] {
  const weekday = parseISODate(date).getDay()
  const windows = doctor.availability.filter(
    (availability) => availability.day === weekday,
  )
  if (windows.length === 0) return []

  const booked = new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.doctorId === doctor.id &&
          appointment.date === date &&
          (appointment.status === 'pending' ||
            appointment.status === 'confirmed'),
      )
      .map((appointment) => appointment.time),
  )

  const slots = new Set<string>()
  windows.forEach((window) => {
    generateTimeSlots(window.start, window.end, window.slotMinutes).forEach(
      (slot) => {
        if (!booked.has(slot) && !isPastSlot(date, slot)) {
          slots.add(slot)
        }
      },
    )
  })

  return Array.from(slots).sort()
}

export function getNextAvailableSlot(
  doctor: Doctor,
  appointments: Appointment[],
  days = 14,
): AvailableSlot | null {
  for (const date of getNextDays(days)) {
    const slots = getAvailableSlotsForDoctor(doctor, date, appointments)
    if (slots.length > 0) {
      return { date, time: slots[0] }
    }
  }
  return null
}

export function getNextAvailableSlots(
  doctor: Doctor,
  appointments: Appointment[],
  count = 3,
  days = 14,
): AvailableSlot[] {
  const results: AvailableSlot[] = []
  for (const date of getNextDays(days)) {
    const slots = getAvailableSlotsForDoctor(doctor, date, appointments)
    for (const time of slots) {
      results.push({ date, time })
      if (results.length >= count) return results
    }
  }
  return results
}

export function formatNextSlot(slot: AvailableSlot): string {
  const day = relativeDayLabel(slot.date)
  const prefix =
    day === 'Today' || day === 'Tomorrow' ? day : formatDateShort(slot.date)
  return `${prefix} at ${formatTime(slot.time)}`
}
