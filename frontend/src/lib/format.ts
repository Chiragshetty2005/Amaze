import type { AppointmentStatus, InvoiceStatus } from '../types'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return inr.format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

export function getInitials(name: string): string {
  const cleaned = name.replace(/^Dr\.?\s+/i, '')
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural
}

export const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  issued: 'Issued',
  paid: 'Paid',
}

export function getAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export function getDosageLabel(
  morning: number,
  afternoon: number,
  night: number,
  foodRelation: 'AF' | 'BF',
): string {
  return `${morning}-${afternoon}-${night} ${foodRelation}`
}
