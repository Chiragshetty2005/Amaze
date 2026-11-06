import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { initialClinicState, type ClinicState } from '../mocks/data'
import type {
  Appointment,
  AppointmentStatus,
  Consultation,
  Doctor,
  Invoice,
  MedicalTest,
  Medicine,
  Patient,
  PrescriptionItem,
  Specialization,
} from '../types'
import { nowISO } from '../lib/date'
import { getInvoiceTotals } from '../lib/invoice'

const STORAGE_KEY = `amazecare-clinic-v1-${new Date().toISOString().slice(0, 10)}`

export interface NewAppointmentInput {
  patientId: string
  doctorId: string
  date: string
  time: string
  symptoms: string
  natureOfVisit: string
}

export interface ConsultationInput {
  symptoms: string
  physicalExam: string
  treatmentPlan: string
  diagnosis: string
  testIds: string[]
  prescription: Omit<PrescriptionItem, 'id'>[]
}

interface ClinicContextValue {
  state: ClinicState
  addPatient: (input: Omit<Patient, 'id' | 'userId'>) => Patient
  updatePatient: (id: string, patch: Partial<Patient>) => void
  deletePatient: (id: string) => void
  addDoctor: (input: Omit<Doctor, 'id' | 'userId'>) => Doctor
  updateDoctor: (id: string, patch: Partial<Doctor>) => void
  deleteDoctor: (id: string) => void
  addSpecialization: (
    input: Omit<Specialization, 'id'>,
  ) => Specialization
  updateSpecialization: (id: string, patch: Partial<Specialization>) => void
  deleteSpecialization: (id: string) => void
  addMedicine: (input: Omit<Medicine, 'id'>) => Medicine
  updateMedicine: (id: string, patch: Partial<Medicine>) => void
  deleteMedicine: (id: string) => void
  addTest: (input: Omit<MedicalTest, 'id'>) => MedicalTest
  updateTest: (id: string, patch: Partial<MedicalTest>) => void
  deleteTest: (id: string) => void
  createAppointment: (input: NewAppointmentInput) => Appointment
  updateAppointment: (id: string, patch: Partial<Appointment>) => void
  confirmAppointment: (id: string) => void
  rejectAppointment: (id: string, reason: string) => void
  cancelAppointment: (id: string, reason: string) => void
  rescheduleAppointment: (
    id: string,
    date: string,
    time: string,
    by: 'patient' | 'doctor' | 'admin',
  ) => void
  completeConsultation: (
    appointmentId: string,
    input: ConsultationInput,
  ) => { consultation: Consultation; invoice: Invoice } | null
  markInvoicePaid: (id: string) => void
  getPatient: (id: string) => Patient | undefined
  getDoctor: (id: string) => Doctor | undefined
  getSpecialization: (id: string) => Specialization | undefined
  getMedicine: (id: string) => Medicine | undefined
  getTest: (id: string) => MedicalTest | undefined
  getPatientAppointments: (patientId: string) => Appointment[]
  getDoctorAppointments: (doctorId: string) => Appointment[]
  getConsultationForAppointment: (
    appointmentId: string,
  ) => Consultation | undefined
  getInvoiceForAppointment: (appointmentId: string) => Invoice | undefined
}

const ClinicContext = createContext<ClinicContextValue | null>(null)

function loadState(): ClinicState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as ClinicState
    }
  } catch {
    // Fall through to the seed data.
  }
  return initialClinicState
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClinicState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can fail in private browsing. The demo still works in memory.
    }
  }, [state])

  const addPatient: ClinicContextValue['addPatient'] = (input) => {
    const id = nextId('p')
    const patient: Patient = { ...input, id, userId: `u-${id}` }
    setState((current) => ({
      ...current,
      patients: [...current.patients, patient],
    }))
    return patient
  }

  const updatePatient: ClinicContextValue['updatePatient'] = (id, patch) => {
    setState((current) => ({
      ...current,
      patients: current.patients.map((patient) =>
        patient.id === id ? { ...patient, ...patch } : patient,
      ),
    }))
  }

  const deletePatient: ClinicContextValue['deletePatient'] = (id) => {
    setState((current) => {
      const appointmentIds = new Set(
        current.appointments
          .filter((appointment) => appointment.patientId === id)
          .map((appointment) => appointment.id),
      )
      return {
        ...current,
        patients: current.patients.filter((patient) => patient.id !== id),
        appointments: current.appointments.filter(
          (appointment) => appointment.patientId !== id,
        ),
        consultations: current.consultations.filter(
          (consultation) => !appointmentIds.has(consultation.appointmentId),
        ),
        invoices: current.invoices.filter(
          (invoice) => !appointmentIds.has(invoice.appointmentId),
        ),
      }
    })
  }

  const addDoctor: ClinicContextValue['addDoctor'] = (input) => {
    const id = nextId('d')
    const doctor: Doctor = { ...input, id, userId: `u-${id}` }
    setState((current) => ({
      ...current,
      doctors: [...current.doctors, doctor],
    }))
    return doctor
  }

  const updateDoctor: ClinicContextValue['updateDoctor'] = (id, patch) => {
    setState((current) => ({
      ...current,
      doctors: current.doctors.map((doctor) =>
        doctor.id === id ? { ...doctor, ...patch } : doctor,
      ),
    }))
  }

  const deleteDoctor: ClinicContextValue['deleteDoctor'] = (id) => {
    setState((current) => {
      const appointmentIds = new Set(
        current.appointments
          .filter((appointment) => appointment.doctorId === id)
          .map((appointment) => appointment.id),
      )
      return {
        ...current,
        doctors: current.doctors.filter((doctor) => doctor.id !== id),
        appointments: current.appointments.filter(
          (appointment) => appointment.doctorId !== id,
        ),
        consultations: current.consultations.filter(
          (consultation) => !appointmentIds.has(consultation.appointmentId),
        ),
        invoices: current.invoices.filter(
          (invoice) => !appointmentIds.has(invoice.appointmentId),
        ),
      }
    })
  }

  const addSpecialization: ClinicContextValue['addSpecialization'] = (input) => {
    const specialization: Specialization = { ...input, id: nextId('s') }
    setState((current) => ({
      ...current,
      specializations: [...current.specializations, specialization],
    }))
    return specialization
  }

  const updateSpecialization: ClinicContextValue['updateSpecialization'] = (
    id,
    patch,
  ) => {
    setState((current) => ({
      ...current,
      specializations: current.specializations.map((specialization) =>
        specialization.id === id
          ? { ...specialization, ...patch }
          : specialization,
      ),
    }))
  }

  const deleteSpecialization: ClinicContextValue['deleteSpecialization'] = (
    id,
  ) => {
    setState((current) => ({
      ...current,
      specializations: current.specializations.filter(
        (specialization) => specialization.id !== id,
      ),
      doctors: current.doctors.filter(
        (doctor) => doctor.specializationId !== id,
      ),
    }))
  }

  const addMedicine: ClinicContextValue['addMedicine'] = (input) => {
    const medicine: Medicine = { ...input, id: nextId('m') }
    setState((current) => ({
      ...current,
      medicines: [...current.medicines, medicine],
    }))
    return medicine
  }

  const updateMedicine: ClinicContextValue['updateMedicine'] = (id, patch) => {
    setState((current) => ({
      ...current,
      medicines: current.medicines.map((medicine) =>
        medicine.id === id ? { ...medicine, ...patch } : medicine,
      ),
    }))
  }

  const deleteMedicine: ClinicContextValue['deleteMedicine'] = (id) => {
    setState((current) => ({
      ...current,
      medicines: current.medicines.filter((medicine) => medicine.id !== id),
    }))
  }

  const addTest: ClinicContextValue['addTest'] = (input) => {
    const test: MedicalTest = { ...input, id: nextId('t') }
    setState((current) => ({
      ...current,
      tests: [...current.tests, test],
    }))
    return test
  }

  const updateTest: ClinicContextValue['updateTest'] = (id, patch) => {
    setState((current) => ({
      ...current,
      tests: current.tests.map((test) =>
        test.id === id ? { ...test, ...patch } : test,
      ),
    }))
  }

  const deleteTest: ClinicContextValue['deleteTest'] = (id) => {
    setState((current) => ({
      ...current,
      tests: current.tests.filter((test) => test.id !== id),
    }))
  }

  const createAppointment: ClinicContextValue['createAppointment'] = (input) => {
    const appointment: Appointment = {
      ...input,
      id: nextId('a'),
      status: 'pending',
      createdAt: nowISO(),
    }
    setState((current) => ({
      ...current,
      appointments: [...current.appointments, appointment],
    }))
    return appointment
  }

  const updateAppointment: ClinicContextValue['updateAppointment'] = (
    id,
    patch,
  ) => {
    setState((current) => ({
      ...current,
      appointments: current.appointments.map((appointment) =>
        appointment.id === id ? { ...appointment, ...patch } : appointment,
      ),
    }))
  }

  const confirmAppointment: ClinicContextValue['confirmAppointment'] = (id) => {
    updateAppointment(id, { status: 'confirmed' })
  }

  const rejectAppointment: ClinicContextValue['rejectAppointment'] = (
    id,
    reason,
  ) => {
    updateAppointment(id, {
      status: 'rejected',
      cancellationReason: reason,
    })
  }

  const cancelAppointment: ClinicContextValue['cancelAppointment'] = (
    id,
    reason,
  ) => {
    updateAppointment(id, {
      status: 'cancelled',
      cancellationReason: reason,
    })
  }

  const rescheduleAppointment: ClinicContextValue['rescheduleAppointment'] = (
    id,
    date,
    time,
    by,
  ) => {
    const status: AppointmentStatus = by === 'patient' ? 'pending' : 'confirmed'
    updateAppointment(id, { date, time, status, cancellationReason: undefined })
  }

  const completeConsultation: ClinicContextValue['completeConsultation'] = (
    appointmentId,
    input,
  ) => {
    const appointment = state.appointments.find(
      (item) => item.id === appointmentId,
    )
    if (!appointment) return null
    const doctor = state.doctors.find(
      (item) => item.id === appointment.doctorId,
    )
    if (!doctor) return null

    const consultation: Consultation = {
      id: nextId('c'),
      appointmentId,
      symptoms: input.symptoms,
      physicalExam: input.physicalExam,
      treatmentPlan: input.treatmentPlan,
      diagnosis: input.diagnosis,
      testIds: input.testIds,
      prescription: input.prescription.map((item) => ({
        ...item,
        id: nextId('rx'),
      })),
      createdAt: nowISO(),
    }

    const selectedTests = state.tests.filter((test) =>
      input.testIds.includes(test.id),
    )
    const year = new Date().getFullYear()
    const invoice: Invoice = {
      id: nextId('i'),
      invoiceNumber: `INV-${year}-${String(state.invoices.length + 1).padStart(4, '0')}`,
      appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      issuedAt: nowISO().slice(0, 10),
      items: [
        { description: `Consultation with ${doctor.name}`, amount: doctor.fee },
        ...selectedTests.map((test) => ({
          description: test.name,
          amount: test.price,
        })),
      ],
      taxRate: 0.05,
      status: 'issued',
    }
    // Todo: persist the invoice totals so reports can sum them without recomputing.
    void getInvoiceTotals(invoice)

    setState((current) => ({
      ...current,
      appointments: current.appointments.map((item) =>
        item.id === appointmentId ? { ...item, status: 'completed' } : item,
      ),
      consultations: [
        ...current.consultations.filter(
          (item) => item.appointmentId !== appointmentId,
        ),
        consultation,
      ],
      invoices: [
        ...current.invoices.filter(
          (item) => item.appointmentId !== appointmentId,
        ),
        invoice,
      ],
    }))

    return { consultation, invoice }
  }

  const markInvoicePaid: ClinicContextValue['markInvoicePaid'] = (id) => {
    setState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) =>
        invoice.id === id ? { ...invoice, status: 'paid' } : invoice,
      ),
    }))
  }

  const getPatient = (id: string) =>
    state.patients.find((patient) => patient.id === id)
  const getDoctor = (id: string) =>
    state.doctors.find((doctor) => doctor.id === id)
  const getSpecialization = (id: string) =>
    state.specializations.find((specialization) => specialization.id === id)
  const getMedicine = (id: string) =>
    state.medicines.find((medicine) => medicine.id === id)
  const getTest = (id: string) => state.tests.find((test) => test.id === id)
  const getPatientAppointments = (patientId: string) =>
    state.appointments.filter(
      (appointment) => appointment.patientId === patientId,
    )
  const getDoctorAppointments = (doctorId: string) =>
    state.appointments.filter(
      (appointment) => appointment.doctorId === doctorId,
    )
  const getConsultationForAppointment = (appointmentId: string) =>
    state.consultations.find(
      (consultation) => consultation.appointmentId === appointmentId,
    )
  const getInvoiceForAppointment = (appointmentId: string) =>
    state.invoices.find((invoice) => invoice.appointmentId === appointmentId)

  return (
    <ClinicContext.Provider
      value={{
        state,
        addPatient,
        updatePatient,
        deletePatient,
        addDoctor,
        updateDoctor,
        deleteDoctor,
        addSpecialization,
        updateSpecialization,
        deleteSpecialization,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addTest,
        updateTest,
        deleteTest,
        createAppointment,
        updateAppointment,
        confirmAppointment,
        rejectAppointment,
        cancelAppointment,
        rescheduleAppointment,
        completeConsultation,
        markInvoicePaid,
        getPatient,
        getDoctor,
        getSpecialization,
        getMedicine,
        getTest,
        getPatientAppointments,
        getDoctorAppointments,
        getConsultationForAppointment,
        getInvoiceForAppointment,
      }}
    >
      {children}
    </ClinicContext.Provider>
  )
}

export function useClinic(): ClinicContextValue {
  const context = useContext(ClinicContext)
  if (!context) {
    throw new Error('useClinic must be used inside ClinicProvider')
  }
  return context
}
