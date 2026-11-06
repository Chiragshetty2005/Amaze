import type { Appointment, Doctor, Patient } from '../types'
import { todayISO } from './date'

export function isActiveAppointment(appointment: Appointment): boolean {
  return (
    (appointment.status === 'pending' || appointment.status === 'confirmed') &&
    appointment.date >= todayISO()
  )
}

export function sortByDateTime(
  a: Pick<Appointment, 'date' | 'time'>,
  b: Pick<Appointment, 'date' | 'time'>,
): number {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
}

export function getUpcomingAppointments(
  appointments: Appointment[],
): Appointment[] {
  return appointments
    .filter(isActiveAppointment)
    .slice()
    .sort(sortByDateTime)
}

export function getPastAppointments(appointments: Appointment[]): Appointment[] {
  return appointments
    .filter((appointment) => !isActiveAppointment(appointment))
    .slice()
    .sort((a, b) => sortByDateTime(b, a))
}

export function getNextAppointment(
  appointments: Appointment[],
): Appointment | undefined {
  return getUpcomingAppointments(appointments)[0]
}

export function findPatientByUserId(
  patients: Patient[],
  userId: string,
): Patient | undefined {
  return patients.find((patient) => patient.userId === userId)
}

export function findDoctorByUserId(
  doctors: Doctor[],
  userId: string,
): Doctor | undefined {
  return doctors.find((doctor) => doctor.userId === userId)
}

export function getTodayAppointments(
  appointments: Appointment[],
): Appointment[] {
  return appointments
    .filter((appointment) => appointment.date === todayISO())
    .slice()
    .sort(sortByDateTime)
}
