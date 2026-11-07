import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarBlank,
  CalendarX,
  CheckCircle,
  Clock,
  Plus,
} from '@phosphor-icons/react'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { Button, buttonStyles } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { SelectField, TextAreaField } from '../../components/ui/Form'
import { SlotPicker } from '../../components/ui/SlotPicker'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { getAge, pluralize } from '../../lib/format'
import {
  formatDateShort,
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
  getNextDays,
  todayISO,
} from '../../lib/date'
import { getPastAppointments, getUpcomingAppointments } from '../../lib/selectors'
import { apiErrorMessage } from '../../lib/api'
import type { Appointment } from '../../types'

type TabValue = 'requests' | 'upcoming' | 'all' | 'completed' | 'cancelled'

interface FieldErrors {
  patientId?: string
  specializationId?: string
  doctorId?: string
  date?: string
  time?: string
  symptoms?: string
}

function sortAscending(a: Appointment, b: Appointment): number {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
}

function sortDescending(a: Appointment, b: Appointment): number {
  return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)
}

function AdminAppointmentRow({ appointment }: { appointment: Appointment }) {
  const clinic = useClinic()
  const patient = clinic.getPatient(appointment.patientId)
  const doctor = clinic.getDoctor(appointment.doctorId)
  const specialization = doctor
    ? clinic.getSpecialization(doctor.specializationId)
    : undefined
  if (!patient || !doctor) return null

  const confirm = async () => {
    try {
      await clinic.confirmAppointment(appointment.id)
      toast.success('Appointment confirmed.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex w-full shrink-0 items-center gap-3 rounded-lg bg-paper p-3 sm:w-32 sm:flex-col sm:justify-center sm:gap-0">
          <span className="caption-5 text-muted">
            {formatWeekday(appointment.date)}
          </span>
          <span className="title-2 text-ink">
            {formatDayNumber(appointment.date)}
          </span>
          <span className="caption-5 text-muted">
            {formatMonthShort(appointment.date)}
          </span>
          <span className="ml-auto flex items-center gap-1 font-mono text-xs text-ink sm:ml-0 sm:mt-1">
            <Clock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            {formatTime(appointment.time)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="title-2 text-ink">{patient.name}</p>
          <p className="caption-5 text-muted">
            {getAge(patient.dob)} years. {patient.gender}.{' '}
            {appointment.natureOfVisit}.
          </p>
          <p className="mt-1 body-6 text-muted">
            {doctor.name}
            {specialization ? `, ${specialization.name}` : ''}
          </p>
          <p className="mt-1 line-clamp-1 caption-5 text-muted">
            {appointment.symptoms}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end">
          <StatusChip status={appointment.status} />
          <div className="flex items-center gap-2">
            {appointment.status === 'pending' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void confirm()}
              >
                Confirm
              </Button>
            ) : null}
            <Link
              to={`/admin/appointments/${appointment.id}`}
              className={buttonStyles({ variant: 'ghost', size: 'sm' })}
            >
              Open
            </Link>
          </div>
        </div>
      </div>
    </li>
  )
}

export function AdminAppointmentsPage() {
  useDocumentMeta({
    title: 'Appointments | AmazeCare Admin',
    description: 'Review requests and manage the clinic schedule.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [tab, setTab] = useState<TabValue>('requests')
  const [query, setQuery] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)

  const [patientId, setPatientId] = useState('')
  const [specializationId, setSpecializationId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [natureOfVisit, setNatureOfVisit] = useState('New consultation')
  const [symptoms, setSymptoms] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const appointments = clinic.state.appointments
  const upcoming = getUpcomingAppointments(appointments)
  const requests = appointments
    .filter((appointment) => appointment.status === 'pending')
    .slice()
    .sort(sortAscending)
  const confirmed = upcoming.filter(
    (appointment) => appointment.status === 'confirmed',
  )
  const completed = appointments
    .filter((appointment) => appointment.status === 'completed')
    .slice()
    .sort(sortDescending)
  const cancelled = getPastAppointments(appointments)
    .filter(
      (appointment) =>
        appointment.status === 'cancelled' || appointment.status === 'rejected',
    )
    .slice()
    .sort(sortDescending)
  const allSorted = [...upcoming, ...getPastAppointments(appointments)]

  const normalized = query.trim().toLowerCase()
  const filterList = (list: Appointment[]) =>
    list.filter((appointment) => {
      if (!normalized) return true
      const patient = clinic.getPatient(appointment.patientId)
      const doctor = clinic.getDoctor(appointment.doctorId)
      return [
        patient?.name ?? '',
        doctor?.name ?? '',
        appointment.id,
        appointment.symptoms,
        appointment.natureOfVisit,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })

  const lists: Record<TabValue, Appointment[]> = {
    requests: filterList(requests),
    upcoming: filterList(confirmed),
    all: filterList(allSorted),
    completed: filterList(completed),
    cancelled: filterList(cancelled),
  }

  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: 'requests', label: 'Requests', count: lists.requests.length },
    { value: 'upcoming', label: 'Upcoming', count: lists.upcoming.length },
    { value: 'all', label: 'All', count: lists.all.length },
    { value: 'completed', label: 'Completed', count: lists.completed.length },
    { value: 'cancelled', label: 'Cancelled', count: lists.cancelled.length },
  ]

  const dates = useMemo(() => getNextDays(14), [])
  const selectedDoctor = doctorId ? clinic.getDoctor(doctorId) : undefined
  const doctorOptions = clinic.state.doctors
    .filter(
      (doctor) =>
        !specializationId || doctor.specializationId === specializationId,
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((doctor) => ({
      value: doctor.id,
      label: `${doctor.name} (${doctor.designation})`,
    }))
  const patientOptions = clinic.state.patients
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((patient) => ({
      value: patient.id,
      label: `${patient.name} (${patient.phone})`,
    }))
  const specializationOptions = clinic.state.specializations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((specialization) => ({
      value: specialization.id,
      label: specialization.name,
    }))

  const availableDates = useMemo(() => {
    const set = new Set<string>()
    if (!selectedDoctor) return set
    dates.forEach((item) => {
      if (clinic.getAvailableSlotsForDoctor(selectedDoctor.id, item).length > 0) {
        set.add(item)
      }
    })
    return set
  }, [selectedDoctor, dates, clinic])

  const slots = useMemo(
    () =>
      selectedDoctor
        ? clinic.getAvailableSlotsForDoctor(selectedDoctor.id, date)
        : [],
    [selectedDoctor, date, clinic],
  )

  const openBooking = () => {
    setPatientId('')
    setSpecializationId('')
    setDoctorId('')
    setDate('')
    setTime('')
    setNatureOfVisit('New consultation')
    setSymptoms('')
    setErrors({})
    setBookingOpen(true)
  }

  const onSpecializationChange = (value: string) => {
    setSpecializationId(value)
    setDoctorId('')
    setDate('')
    setTime('')
    setErrors((current) => ({
      ...current,
      specializationId: undefined,
      doctorId: undefined,
      time: undefined,
    }))
  }

  const onDoctorChange = (value: string) => {
    setDoctorId(value)
    const doctor = value ? clinic.getDoctor(value) : undefined
    const next = doctor ? clinic.getNextAvailableSlot(doctor.id) : null
    setDate(next?.date ?? dates[0])
    setTime(next?.time ?? '')
    setErrors((current) => ({
      ...current,
      doctorId: undefined,
      date: undefined,
      time: undefined,
    }))
  }

  const handleBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (!patientId) nextErrors.patientId = 'Choose a patient.'
    if (!specializationId)
      nextErrors.specializationId = 'Choose a department.'
    if (!doctorId) nextErrors.doctorId = 'Choose a doctor.'
    if (!date) nextErrors.date = 'Choose a date.'
    if (!time) nextErrors.time = 'Choose a slot.'
    if (symptoms.trim().length < 5)
      nextErrors.symptoms = 'Add at least 5 characters describing the concern.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await clinic.createAppointment({
        patientId,
        doctorId,
        date,
        time,
        symptoms: symptoms.trim(),
        natureOfVisit,
      })
      setBookingOpen(false)
      setTab('requests')
      toast.success('Appointment request created.')
    } catch (error) {
      toast.error(apiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description={`${requests.length} ${pluralize(
          requests.length,
          'request',
        )} waiting. ${confirmed.length} confirmed ${
          confirmed.length === 1 ? 'visit' : 'visits'
        } ahead.`}
        actions={
          <Button type="button" onClick={openBooking}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New appointment
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search patient or doctor"
          ariaLabel="Search appointments"
          className="sm:max-w-md"
        />
        <p className="caption-5 text-muted">
          Today is{' '}
          <span className="font-mono">
            {formatWeekday(todayISO())}, {formatDayNumber(todayISO())}{' '}
            {formatMonthShort(todayISO())}
          </span>
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabValue)}
        mode="filter"
      >
        <TabsList ariaLabel="Filter appointments">
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}{' '}
              <span className="ml-1 caption-5 text-muted">{item.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {lists[tab].length === 0 ? (
        <EmptyState
          icon={
            tab === 'cancelled' ? (
              <CalendarX className="h-6 w-6" aria-hidden="true" />
            ) : tab === 'completed' ? (
              <CheckCircle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <CalendarBlank className="h-6 w-6" aria-hidden="true" />
            )
          }
          title={
            query
              ? 'No appointment matches'
              : tab === 'requests'
                ? 'No requests waiting'
                : tab === 'upcoming'
                  ? 'No confirmed visits'
                  : tab === 'completed'
                    ? 'No completed visits'
                    : 'No appointments'
          }
          description={
            query
              ? 'Try a different name, doctor, symptom, or appointment ID.'
              : tab === 'requests'
                ? 'New requests will appear here for review.'
                : 'Appointments will appear here as the clinic schedule fills.'
          }
          action={
            tab === 'requests' && !query ? (
              <Button type="button" onClick={openBooking}>
                Book an appointment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {lists[tab].map((appointment) => (
            <AdminAppointmentRow
              key={appointment.id}
              appointment={appointment}
            />
          ))}
        </ul>
      )}

      <p className="caption-5 text-muted">
        {lists[tab].length} {pluralize(lists[tab].length, 'appointment')} shown.
        Status changes are saved in this browser.
      </p>

      <Modal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        title="Book an appointment"
        description="Create a request on behalf of a patient. It enters the request queue as pending."
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBookingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="admin-booking-form"
              isLoading={isSubmitting}
            >
              Create request
            </Button>
          </>
        }
      >
        <form
          id="admin-booking-form"
          className="flex flex-col gap-4"
          onSubmit={handleBooking}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Patient"
              placeholder="Choose a patient"
              options={patientOptions}
              value={patientId}
              error={errors.patientId}
              onChange={(event) => {
                setPatientId(event.target.value)
                setErrors((current) => ({
                  ...current,
                  patientId: undefined,
                }))
              }}
              required
            />
            <SelectField
              label="Department"
              placeholder="Choose a department"
              options={specializationOptions}
              value={specializationId}
              error={errors.specializationId}
              onChange={(event) =>
                onSpecializationChange(event.target.value)
              }
              required
            />
            <SelectField
              label="Doctor"
              placeholder={
                specializationId
                  ? 'Choose a doctor'
                  : 'Choose a department first'
              }
              options={doctorOptions}
              value={doctorId}
              error={errors.doctorId}
              onChange={(event) => onDoctorChange(event.target.value)}
              disabled={!specializationId}
              required
            />
            <SelectField
              label="Visit type"
              options={[
                { value: 'New consultation', label: 'New consultation' },
                { value: 'Follow up', label: 'Follow up' },
              ]}
              value={natureOfVisit}
              onChange={(event) => setNatureOfVisit(event.target.value)}
              required
            />
          </div>

          {selectedDoctor ? (
            <div className="rounded-xl border border-line bg-paper/50 p-3">
              <SlotPicker
                dates={dates}
                date={date}
                onDateChange={(value) => {
                  setDate(value)
                  setTime('')
                  setErrors((current) => ({
                    ...current,
                    date: undefined,
                    time: undefined,
                  }))
                }}
                slots={slots}
                time={time}
                onTimeChange={(value) => {
                  setTime(value)
                  setErrors((current) => ({ ...current, time: undefined }))
                }}
                availableDates={availableDates}
              />
              {errors.date || errors.time ? (
                <p className="mt-2 body-6 text-danger" role="alert">
                  {errors.date ?? errors.time}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line p-4 body-6 text-muted">
              Choose a doctor to see the next available slots.
            </p>
          )}

          <TextAreaField
            label="Reason for visit"
            placeholder="Describe the concern in the patient's words."
            value={symptoms}
            error={errors.symptoms}
            onChange={(event) => {
              setSymptoms(event.target.value)
              setErrors((current) => ({ ...current, symptoms: undefined }))
            }}
            required
          />

          <p className="caption-5 text-muted">
            The appointment will be created for{' '}
            <span className="font-mono">{formatDateShort(date || todayISO())}</span>
            {time ? (
              <>
                {' '}
                at <span className="font-mono">{formatTime(time)}</span>
              </>
            ) : null}
            . All times are clinic local time.
          </p>
        </form>
      </Modal>
    </div>
  )
}
