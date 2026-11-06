export type Role = 'patient' | 'doctor' | 'admin'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export type InvoiceStatus = 'issued' | 'paid'

export type Gender = 'Female' | 'Male' | 'Other'

export interface SessionUser {
  id: string
  role: Role
  name: string
  email: string
  phone: string
  photoUrl?: string
}

export interface Doctor {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  specializationId: string
  experienceYears: number
  qualification: string
  designation: string
  fee: number
  bio: string
  photoUrl?: string
  availability: DoctorAvailability[]
}

export interface DoctorAvailability {
  day: number
  start: string
  end: string
  slotMinutes: number
}

export interface Patient {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  dob: string
  gender: Gender
  address: string
}

export interface Specialization {
  id: string
  name: string
  description: string
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  date: string
  time: string
  status: AppointmentStatus
  symptoms: string
  natureOfVisit: string
  createdAt: string
  cancellationReason?: string
}

export interface PrescriptionItem {
  id: string
  medicineId: string
  medicineName: string
  morning: number
  afternoon: number
  night: number
  foodRelation: 'AF' | 'BF'
  durationDays: number
  instructions: string
}

export interface Consultation {
  id: string
  appointmentId: string
  symptoms: string
  physicalExam: string
  treatmentPlan: string
  diagnosis: string
  testIds: string[]
  prescription: PrescriptionItem[]
  createdAt: string
}

export interface InvoiceItem {
  description: string
  amount: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  appointmentId: string
  patientId: string
  doctorId: string
  issuedAt: string
  items: InvoiceItem[]
  taxRate: number
  status: InvoiceStatus
}

export interface Medicine {
  id: string
  name: string
  form: string
  strength: string
}

export interface MedicalTest {
  id: string
  name: string
  price: number
}

export interface Testimonial {
  quote: string
  name: string
  context: string
}

export interface Faq {
  question: string
  answer: string
}
