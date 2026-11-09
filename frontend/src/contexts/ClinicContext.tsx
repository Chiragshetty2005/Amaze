import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { apiDownload, apiErrorMessage, apiRequest } from '../lib/api'
import type {
  Appointment,
  AppointmentStatus,
  Consultation,
  Doctor,
  Gender,
  Invoice,
  InvoiceStatus,
  MedicalTest,
  Medicine,
  Patient,
  PrescriptionItem,
  Specialization,
} from '../types'
import type { AvailableSlot } from '../lib/slots'
import { addDaysISO, todayISO } from '../lib/date'

export interface ClinicState {
  specializations: Specialization[]
  doctors: Doctor[]
  patients: Patient[]
  appointments: Appointment[]
  consultations: Consultation[]
  invoices: Invoice[]
  medicines: Medicine[]
  tests: MedicalTest[]
}

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
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  addPatient: (
    input: Omit<Patient, 'id' | 'userId'>,
  ) => Promise<{ patient: Patient; invitationSent: boolean }>
  updatePatient: (id: string, patch: Partial<Patient>) => Promise<Patient>
  deletePatient: (id: string) => Promise<void>
  addDoctor: (
    input: Omit<Doctor, 'id' | 'userId'>,
  ) => Promise<{ doctor: Doctor; invitationSent: boolean }>
  updateDoctor: (id: string, patch: Partial<Doctor>) => Promise<Doctor>
  deleteDoctor: (id: string) => Promise<void>
  addSpecialization: (
    input: Omit<Specialization, 'id'>,
  ) => Promise<Specialization>
  updateSpecialization: (
    id: string,
    patch: Partial<Specialization>,
  ) => Promise<Specialization>
  deleteSpecialization: (id: string) => Promise<void>
  addMedicine: (input: Omit<Medicine, 'id'>) => Promise<Medicine>
  updateMedicine: (id: string, patch: Partial<Medicine>) => Promise<Medicine>
  deleteMedicine: (id: string) => Promise<void>
  addTest: (input: Omit<MedicalTest, 'id'>) => Promise<MedicalTest>
  updateTest: (id: string, patch: Partial<MedicalTest>) => Promise<MedicalTest>
  deleteTest: (id: string) => Promise<void>
  createAppointment: (input: NewAppointmentInput) => Promise<Appointment>
  confirmAppointment: (id: string) => Promise<Appointment>
  rejectAppointment: (id: string, reason: string) => Promise<Appointment>
  cancelAppointment: (id: string, reason: string) => Promise<Appointment>
  rescheduleAppointment: (
    id: string,
    date: string,
    time: string,
    by: 'patient' | 'doctor' | 'admin',
  ) => Promise<Appointment>
  completeConsultation: (
    appointmentId: string,
    input: ConsultationInput,
  ) => Promise<{ consultation: Consultation; invoice: Invoice }>
  markInvoicePaid: (id: string) => Promise<Invoice>
  emailInvoice: (id: string) => Promise<string>
  downloadInvoicePdf: (id: string, invoiceNumber: string) => Promise<void>
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
  getAvailableSlotsForDoctor: (doctorId: string, date: string) => string[]
  getNextAvailableSlot: (
    doctorId: string,
    days?: number,
  ) => AvailableSlot | null
  getNextAvailableSlots: (
    doctorId: string,
    count?: number,
    days?: number,
  ) => AvailableSlot[]
}

const ClinicContext = createContext<ClinicContextValue | null>(null)

const emptyState: ClinicState = {
  specializations: [],
  doctors: [],
  patients: [],
  appointments: [],
  consultations: [],
  invoices: [],
  medicines: [],
  tests: [],
}

interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

interface ApiDoctorAvailability {
  day: number
  start: string
  end: string
  slotMinutes: number
}

interface ApiDoctor {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  photoUrl?: string | null
  specializationId: string
  experienceYears: number
  qualification: string
  designation: string
  fee: number
  bio: string
  availability: ApiDoctorAvailability[]
}

interface ApiPatient {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  address: string
}

interface ApiSpecialization {
  id: string
  name: string
  description: string
}

interface ApiAppointment {
  id: string
  patientId: string
  doctorId: string
  date: string
  time: string
  status: string
  symptoms: string
  natureOfVisit: string
  createdAt: string
  cancellationReason?: string | null
}

interface ApiPrescription {
  id: string
  medicineId?: string | null
  medicineName: string
  morning: number
  afternoon: number
  night: number
  foodRelation: string
  durationDays: number
  instructions: string
}

interface ApiConsultation {
  id: string
  appointmentId: string
  symptoms: string
  physicalExam: string
  treatmentPlan: string
  diagnosis: string
  tests: { id: string; name: string; price: number }[]
  prescription: ApiPrescription[]
  createdAt: string
}

interface ApiInvoice {
  id: string
  invoiceNumber: string
  appointmentId: string
  patientId: string
  doctorId: string
  issuedAt: string
  items: { description: string; amount: number }[]
  taxRate: number
  status: string
}

interface ApiConsultationResult {
  consultation: ApiConsultation
  invoice: ApiInvoice
}

function mapDoctor(doctor: ApiDoctor): Doctor {
  return {
    id: doctor.id,
    userId: doctor.userId,
    name: doctor.name,
    email: doctor.email,
    phone: doctor.phone,
    specializationId: doctor.specializationId,
    experienceYears: doctor.experienceYears,
    qualification: doctor.qualification,
    designation: doctor.designation,
    fee: doctor.fee,
    bio: doctor.bio,
    photoUrl: doctor.photoUrl ?? undefined,
    availability: doctor.availability.map((item) => ({
      day: item.day,
      start: item.start,
      end: item.end,
      slotMinutes: item.slotMinutes,
    })),
  }
}

function mapPatient(patient: ApiPatient): Patient {
  return {
    id: patient.id,
    userId: patient.userId,
    name: patient.name,
    email: patient.email,
    phone: patient.phone,
    dob: patient.dateOfBirth,
    gender: patient.gender as Gender,
    address: patient.address,
  }
}

function mapAppointment(appointment: ApiAppointment): Appointment {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status as AppointmentStatus,
    symptoms: appointment.symptoms,
    natureOfVisit: appointment.natureOfVisit,
    createdAt: appointment.createdAt,
    cancellationReason: appointment.cancellationReason ?? undefined,
  }
}

function mapConsultation(consultation: ApiConsultation): Consultation {
  return {
    id: consultation.id,
    appointmentId: consultation.appointmentId,
    symptoms: consultation.symptoms,
    physicalExam: consultation.physicalExam,
    treatmentPlan: consultation.treatmentPlan,
    diagnosis: consultation.diagnosis,
    testIds: consultation.tests.map((test) => test.id),
    prescription: consultation.prescription.map((item) => ({
      id: item.id,
      medicineId: item.medicineId ?? '',
      medicineName: item.medicineName,
      morning: item.morning,
      afternoon: item.afternoon,
      night: item.night,
      foodRelation: item.foodRelation as 'AF' | 'BF',
      durationDays: item.durationDays,
      instructions: item.instructions,
    })),
    createdAt: consultation.createdAt,
  }
}

function mapInvoice(invoice: ApiInvoice): Invoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    appointmentId: invoice.appointmentId,
    patientId: invoice.patientId,
    doctorId: invoice.doctorId,
    issuedAt: invoice.issuedAt,
    items: invoice.items.map((item) => ({
      description: item.description,
      amount: item.amount,
    })),
    taxRate: invoice.taxRate,
    status: invoice.status as InvoiceStatus,
  }
}

async function fetchItems<T>(path: string): Promise<T[]> {
  const result = await apiRequest<PagedResult<T>>(path)
  return result.items
}

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const [state, setState] = useState<ClinicState>(emptyState)
  const [slots, setSlots] = useState<Record<string, AvailableSlot[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadSerial = useRef(0)

  const fetchSlotsForDoctors = useCallback(
    async (doctors: Doctor[]): Promise<Record<string, AvailableSlot[]>> => {
      const entries = await Promise.all(
        doctors.map(async (doctor) => {
          try {
            const result = await apiRequest<AvailableSlot[]>(
              `/Doctors/${doctor.id}/slots?days=14`,
              { auth: false },
            )
            return [doctor.id, result] as const
          } catch {
            return [doctor.id, []] as const
          }
        }),
      )
      return Object.fromEntries(entries)
    },
    [],
  )

  const loadAll = useCallback(
    async (showLoader: boolean) => {
      const serial = ++loadSerial.current
      if (showLoader) setIsLoading(true)
      setError(null)

      try {
        const [specializations, doctorPage] = await Promise.all([
          apiRequest<ApiSpecialization[]>('/Specializations', { auth: false }),
          apiRequest<PagedResult<ApiDoctor>>('/Doctors?pageSize=100', {
            auth: false,
          }),
        ])
        const doctors = doctorPage.items.map(mapDoctor)

        let patients: Patient[] = []
        let appointments: Appointment[] = []
        let consultations: Consultation[] = []
        let invoices: Invoice[] = []
        let medicines: Medicine[] = []
        let tests: MedicalTest[] = []

        if (user) {
          const catalogPromise = Promise.all([
            fetchItems<Medicine>('/Medicines?pageSize=100'),
            fetchItems<MedicalTest>('/MedicalTests?pageSize=100'),
          ])
          const roleDataPromise =
            user.role === 'patient'
              ? Promise.all([
                  apiRequest<ApiPatient>('/Patients/me'),
                  fetchItems<ApiAppointment>('/Appointments?pageSize=100'),
                  fetchItems<ApiConsultation>('/Consultations?pageSize=100'),
                  fetchItems<ApiInvoice>('/Invoices?pageSize=100'),
                ]).then(([patient, appointmentItems, consultationItems, invoiceItems]) => ({
                  patients: [mapPatient(patient)],
                  appointments: appointmentItems.map(mapAppointment),
                  consultations: consultationItems.map(mapConsultation),
                  invoices: invoiceItems.map(mapInvoice),
                }))
              : Promise.all([
                  fetchItems<ApiPatient>('/Patients?pageSize=100'),
                  fetchItems<ApiAppointment>('/Appointments?pageSize=100'),
                  fetchItems<ApiConsultation>('/Consultations?pageSize=100'),
                  fetchItems<ApiInvoice>('/Invoices?pageSize=100'),
                ]).then(
                  ([
                    patientItems,
                    appointmentItems,
                    consultationItems,
                    invoiceItems,
                  ]) => ({
                    patients: patientItems.map(mapPatient),
                    appointments: appointmentItems.map(mapAppointment),
                    consultations: consultationItems.map(mapConsultation),
                    invoices: invoiceItems.map(mapInvoice),
                  }),
                )

          const [catalog, roleData] = await Promise.all([
            catalogPromise,
            roleDataPromise,
          ])
          ;[medicines, tests] = catalog
          ;({ patients, appointments, consultations, invoices } = roleData)
        }

        const slotMap = await fetchSlotsForDoctors(doctors)
        if (serial !== loadSerial.current) return

        setState({
          specializations: specializations.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
          })),
          doctors,
          patients,
          appointments,
          consultations,
          invoices,
          medicines,
          tests,
        })
        setSlots(slotMap)
      } catch (loadError) {
        if (serial !== loadSerial.current) return
        setError(apiErrorMessage(loadError))
      } finally {
        if (serial === loadSerial.current) setIsLoading(false)
      }
    },
    [fetchSlotsForDoctors, user],
  )

  useEffect(() => {
    void loadAll(true)
  }, [loadAll])

  const refresh = useCallback(async () => {
    await loadAll(false)
  }, [loadAll])

  const refreshDoctorSlots = useCallback(async (doctorId: string) => {
    try {
      const result = await apiRequest<AvailableSlot[]>(
        `/Doctors/${doctorId}/slots?days=14`,
        { auth: false },
      )
      setSlots((current) => ({ ...current, [doctorId]: result }))
    } catch {
      // Slot refresh is best effort; booking errors will surface the detail.
    }
  }, [])

  const addPatient: ClinicContextValue['addPatient'] = async (input) => {
    const response = await apiRequest<{
      patient: ApiPatient
      invitationSent: boolean
    }>('/Patients', {
      method: 'POST',
      body: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        dateOfBirth: input.dob,
        gender: input.gender,
        address: input.address,
      },
    })
    const patient = mapPatient(response.patient)
    setState((current) => ({
      ...current,
      patients: [...current.patients, patient],
    }))
    return { patient, invitationSent: response.invitationSent }
  }

  const updatePatient: ClinicContextValue['updatePatient'] = async (
    id,
    patch,
  ) => {
    const existing = state.patients.find((item) => item.id === id)
    if (!existing) throw new Error('Patient not found.')
    const merged = { ...existing, ...patch }
    const body = {
      name: merged.name,
      phone: merged.phone,
      dateOfBirth: merged.dob,
      gender: merged.gender,
      address: merged.address,
    }
    const isOwnProfile =
      user?.role === 'patient' && existing.userId === user.id
    const response = await apiRequest<ApiPatient>(
      isOwnProfile ? '/Patients/me' : `/Patients/${id}`,
      { method: 'PUT', body },
    )
    const patient = mapPatient(response)
    setState((current) => ({
      ...current,
      patients: current.patients.map((item) =>
        item.id === id ? patient : item,
      ),
    }))
    return patient
  }

  const deletePatient: ClinicContextValue['deletePatient'] = async (id) => {
    await apiRequest<undefined>(`/Patients/${id}`, { method: 'DELETE' })
    await loadAll(false)
  }

  const addDoctor: ClinicContextValue['addDoctor'] = async (input) => {
    const response = await apiRequest<{
      doctor: ApiDoctor
      invitationSent: boolean
    }>('/Doctors', {
      method: 'POST',
      body: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        specializationId: input.specializationId,
        experienceYears: input.experienceYears,
        qualification: input.qualification,
        designation: input.designation,
        fee: input.fee,
        bio: input.bio,
        photoUrl: input.photoUrl ?? null,
        availability: input.availability,
      },
    })
    const doctor = mapDoctor(response.doctor)
    setState((current) => ({
      ...current,
      doctors: [...current.doctors, doctor],
    }))
    await refreshDoctorSlots(doctor.id)
    return { doctor, invitationSent: response.invitationSent }
  }

  const updateDoctor: ClinicContextValue['updateDoctor'] = async (
    id,
    patch,
  ) => {
    const existing = state.doctors.find((item) => item.id === id)
    if (!existing) throw new Error('Doctor not found.')
    const merged = { ...existing, ...patch }
    const isOwnProfile = user?.role === 'doctor' && existing.userId === user.id

    const body = isOwnProfile
      ? {
          name: merged.name,
          phone: merged.phone,
          qualification: merged.qualification,
          designation: merged.designation,
          fee: merged.fee,
          bio: merged.bio,
          photoUrl: merged.photoUrl ?? null,
        }
      : {
          name: merged.name,
          phone: merged.phone,
          specializationId: merged.specializationId,
          experienceYears: merged.experienceYears,
          qualification: merged.qualification,
          designation: merged.designation,
          fee: merged.fee,
          bio: merged.bio,
          photoUrl: merged.photoUrl ?? null,
          availability: merged.availability,
        }

    const response = await apiRequest<ApiDoctor>(
      isOwnProfile ? '/Doctors/me' : `/Doctors/${id}`,
      { method: 'PUT', body },
    )
    const doctor = mapDoctor(response)
    setState((current) => ({
      ...current,
      doctors: current.doctors.map((item) =>
        item.id === id ? doctor : item,
      ),
    }))
    await refreshDoctorSlots(id)
    return doctor
  }

  const deleteDoctor: ClinicContextValue['deleteDoctor'] = async (id) => {
    await apiRequest<undefined>(`/Doctors/${id}`, { method: 'DELETE' })
    await loadAll(false)
  }

  const addSpecialization: ClinicContextValue['addSpecialization'] = async (
    input,
  ) => {
    const response = await apiRequest<ApiSpecialization>('/Specializations', {
      method: 'POST',
      body: { name: input.name, description: input.description },
    })
    const specialization = {
      id: response.id,
      name: response.name,
      description: response.description,
    }
    setState((current) => ({
      ...current,
      specializations: [...current.specializations, specialization],
    }))
    return specialization
  }

  const updateSpecialization: ClinicContextValue['updateSpecialization'] =
    async (id, patch) => {
      const existing = state.specializations.find((item) => item.id === id)
      if (!existing) throw new Error('Department not found.')
      const merged = { ...existing, ...patch }
      const response = await apiRequest<ApiSpecialization>(
        `/Specializations/${id}`,
        {
          method: 'PUT',
          body: { name: merged.name, description: merged.description },
        },
      )
      const specialization = {
        id: response.id,
        name: response.name,
        description: response.description,
      }
      setState((current) => ({
        ...current,
        specializations: current.specializations.map((item) =>
          item.id === id ? specialization : item,
        ),
      }))
      return specialization
    }

  const deleteSpecialization: ClinicContextValue['deleteSpecialization'] =
    async (id) => {
      await apiRequest<undefined>(`/Specializations/${id}`, {
        method: 'DELETE',
      })
      setState((current) => ({
        ...current,
        specializations: current.specializations.filter(
          (item) => item.id !== id,
        ),
      }))
    }

  const addMedicine: ClinicContextValue['addMedicine'] = async (input) => {
    const response = await apiRequest<Medicine>('/Medicines', {
      method: 'POST',
      body: input,
    })
    setState((current) => ({
      ...current,
      medicines: [...current.medicines, response],
    }))
    return response
  }

  const updateMedicine: ClinicContextValue['updateMedicine'] = async (
    id,
    patch,
  ) => {
    const existing = state.medicines.find((item) => item.id === id)
    if (!existing) throw new Error('Medicine not found.')
    const merged = { ...existing, ...patch }
    const response = await apiRequest<Medicine>(`/Medicines/${id}`, {
      method: 'PUT',
      body: {
        name: merged.name,
        form: merged.form,
        strength: merged.strength,
      },
    })
    setState((current) => ({
      ...current,
      medicines: current.medicines.map((item) =>
        item.id === id ? response : item,
      ),
    }))
    return response
  }

  const deleteMedicine: ClinicContextValue['deleteMedicine'] = async (id) => {
    await apiRequest<undefined>(`/Medicines/${id}`, { method: 'DELETE' })
    setState((current) => ({
      ...current,
      medicines: current.medicines.filter((item) => item.id !== id),
    }))
  }

  const addTest: ClinicContextValue['addTest'] = async (input) => {
    const response = await apiRequest<MedicalTest>('/MedicalTests', {
      method: 'POST',
      body: input,
    })
    setState((current) => ({
      ...current,
      tests: [...current.tests, response],
    }))
    return response
  }

  const updateTest: ClinicContextValue['updateTest'] = async (id, patch) => {
    const existing = state.tests.find((item) => item.id === id)
    if (!existing) throw new Error('Medical test not found.')
    const merged = { ...existing, ...patch }
    const response = await apiRequest<MedicalTest>(`/MedicalTests/${id}`, {
      method: 'PUT',
      body: { name: merged.name, price: merged.price },
    })
    setState((current) => ({
      ...current,
      tests: current.tests.map((item) => (item.id === id ? response : item)),
    }))
    return response
  }

  const deleteTest: ClinicContextValue['deleteTest'] = async (id) => {
    await apiRequest<undefined>(`/MedicalTests/${id}`, { method: 'DELETE' })
    setState((current) => ({
      ...current,
      tests: current.tests.filter((item) => item.id !== id),
    }))
  }

  const createAppointment: ClinicContextValue['createAppointment'] = async (
    input,
  ) => {
    const response = await apiRequest<ApiAppointment>('/Appointments', {
      method: 'POST',
      body: {
        patientId: input.patientId,
        doctorId: input.doctorId,
        date: input.date,
        time: input.time,
        symptoms: input.symptoms,
        natureOfVisit: input.natureOfVisit,
      },
    })
    const appointment = mapAppointment(response)
    setState((current) => ({
      ...current,
      appointments: [...current.appointments, appointment],
    }))
    await refreshDoctorSlots(appointment.doctorId)
    return appointment
  }

  const replaceAppointment = (appointment: Appointment) => {
    setState((current) => ({
      ...current,
      appointments: current.appointments.map((item) =>
        item.id === appointment.id ? appointment : item,
      ),
    }))
  }

  const confirmAppointment: ClinicContextValue['confirmAppointment'] = async (
    id,
  ) => {
    const response = await apiRequest<ApiAppointment>(
      `/Appointments/${id}/confirm`,
      { method: 'POST' },
    )
    const appointment = mapAppointment(response)
    replaceAppointment(appointment)
    return appointment
  }

  const rejectAppointment: ClinicContextValue['rejectAppointment'] = async (
    id,
    reason,
  ) => {
    const response = await apiRequest<ApiAppointment>(
      `/Appointments/${id}/reject`,
      { method: 'POST', body: { reason } },
    )
    const appointment = mapAppointment(response)
    replaceAppointment(appointment)
    await refreshDoctorSlots(appointment.doctorId)
    return appointment
  }

  const cancelAppointment: ClinicContextValue['cancelAppointment'] = async (
    id,
    reason,
  ) => {
    const response = await apiRequest<ApiAppointment>(
      `/Appointments/${id}/cancel`,
      { method: 'POST', body: { reason } },
    )
    const appointment = mapAppointment(response)
    replaceAppointment(appointment)
    await refreshDoctorSlots(appointment.doctorId)
    return appointment
  }

  const rescheduleAppointment: ClinicContextValue['rescheduleAppointment'] =
    async (id, date, time) => {
      const response = await apiRequest<ApiAppointment>(
        `/Appointments/${id}/reschedule`,
        { method: 'POST', body: { date, time } },
      )
      const appointment = mapAppointment(response)
      replaceAppointment(appointment)
      await refreshDoctorSlots(appointment.doctorId)
      return appointment
    }

  const completeConsultation: ClinicContextValue['completeConsultation'] =
    async (appointmentId, input) => {
      const response = await apiRequest<ApiConsultationResult>('/Consultations', {
        method: 'POST',
        body: {
          appointmentId,
          symptoms: input.symptoms,
          physicalExam: input.physicalExam,
          treatmentPlan: input.treatmentPlan,
          diagnosis: input.diagnosis,
          testIds: input.testIds,
          prescription: input.prescription.map((item) => ({
            medicineId: item.medicineId,
            morning: item.morning,
            afternoon: item.afternoon,
            night: item.night,
            foodRelation: item.foodRelation,
            durationDays: item.durationDays,
            instructions: item.instructions,
          })),
        },
      })
      const consultation = mapConsultation(response.consultation)
      const invoice = mapInvoice(response.invoice)
      setState((current) => ({
        ...current,
        appointments: current.appointments.map((item) =>
          item.id === appointmentId
            ? { ...item, status: 'completed' }
            : item,
        ),
        consultations: [...current.consultations, consultation],
        invoices: [...current.invoices, invoice],
      }))
      const appointment = state.appointments.find(
        (item) => item.id === appointmentId,
      )
      if (appointment) await refreshDoctorSlots(appointment.doctorId)
      return { consultation, invoice }
    }

  const markInvoicePaid: ClinicContextValue['markInvoicePaid'] = async (id) => {
    const response = await apiRequest<ApiInvoice>(
      `/Invoices/${id}/paid`,
      { method: 'POST' },
    )
    const invoice = mapInvoice(response)
    setState((current) => ({
      ...current,
      invoices: current.invoices.map((item) =>
        item.id === id ? invoice : item,
      ),
    }))
    return invoice
  }

  const emailInvoice: ClinicContextValue['emailInvoice'] = async (id) => {
    const response = await apiRequest<{ message: string }>(
      `/Invoices/${id}/email`,
      { method: 'POST' },
    )
    return response.message
  }

  const downloadInvoicePdf: ClinicContextValue['downloadInvoicePdf'] = async (
    id,
    invoiceNumber,
  ) => {
    await apiDownload(
      `/Invoices/${id}/pdf`,
      `${invoiceNumber.replace(/[^A-Za-z0-9-]/g, '')}.pdf`,
    )
  }

  const getPatient = (id: string) =>
    state.patients.find((item) => item.id === id)
  const getDoctor = (id: string) => state.doctors.find((item) => item.id === id)
  const getSpecialization = (id: string) =>
    state.specializations.find((item) => item.id === id)
  const getMedicine = (id: string) =>
    state.medicines.find((item) => item.id === id)
  const getTest = (id: string) => state.tests.find((item) => item.id === id)
  const getPatientAppointments = (patientId: string) =>
    state.appointments.filter((item) => item.patientId === patientId)
  const getDoctorAppointments = (doctorId: string) =>
    state.appointments.filter((item) => item.doctorId === doctorId)
  const getConsultationForAppointment = (appointmentId: string) =>
    state.consultations.find((item) => item.appointmentId === appointmentId)
  const getInvoiceForAppointment = (appointmentId: string) =>
    state.invoices.find((item) => item.appointmentId === appointmentId)

  const getAvailableSlotsForDoctor = (doctorId: string, date: string) =>
    (slots[doctorId] ?? [])
      .filter((slot) => slot.date === date)
      .map((slot) => slot.time)

  const getNextAvailableSlot = (
    doctorId: string,
    days = 14,
  ): AvailableSlot | null => {
    const today = todayISO()
    const limit = addDaysISO(days + 1)
    return (
      (slots[doctorId] ?? []).find(
        (slot) => slot.date >= today && slot.date < limit,
      ) ?? null
    )
  }

  const getNextAvailableSlots = (
    doctorId: string,
    count = 3,
    days = 14,
  ): AvailableSlot[] => {
    const today = todayISO()
    const limit = addDaysISO(days + 1)
    return (slots[doctorId] ?? [])
      .filter((slot) => slot.date >= today && slot.date < limit)
      .slice(0, count)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-paper px-6">
        <div className="panel flex max-w-sm flex-col items-center gap-4 p-8 text-center">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-mint border-t-primary"
            aria-hidden="true"
          />
          <p className="body-6 text-muted">Preparing your AmazeCare workspace…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-paper px-6">
        <div className="panel flex max-w-md flex-col items-center gap-4 p-8 text-center">
          <p className="caption-3 text-coral">Connection problem</p>
          <h1 className="heading-subsection text-ink">
            We could not load the clinic.
          </h1>
          <p className="body-6 text-muted">{error}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper"
              onClick={() => void refresh()}
            >
              Try again
            </button>
            {user ? (
              <button
                type="button"
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink"
                onClick={() => void logout()}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ClinicContext.Provider
      value={{
        state,
        isLoading,
        error,
        refresh,
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
        confirmAppointment,
        rejectAppointment,
        cancelAppointment,
        rescheduleAppointment,
        completeConsultation,
        markInvoicePaid,
        emailInvoice,
        downloadInvoicePdf,
        getPatient,
        getDoctor,
        getSpecialization,
        getMedicine,
        getTest,
        getPatientAppointments,
        getDoctorAppointments,
        getConsultationForAppointment,
        getInvoiceForAppointment,
        getAvailableSlotsForDoctor,
        getNextAvailableSlot,
        getNextAvailableSlots,
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
