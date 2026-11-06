import { useMemo, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  Stethoscope,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button, buttonStyles } from '../../components/ui/Button'
import { SlotPicker } from '../../components/ui/SlotPicker'
import { TextAreaField, SelectField } from '../../components/ui/Form'
import { getAvailableSlotsForDoctor } from '../../lib/slots'
import { formatCurrency, getAge } from '../../lib/format'
import {
  formatDateLong,
  formatTime,
  getNextDays,
} from '../../lib/date'
import { cn } from '../../lib/cn'

const bookingSchema = z.object({
  natureOfVisit: z.string().min(1, 'Choose the type of visit.'),
  symptoms: z
    .string()
    .trim()
    .min(10, 'Describe the symptoms in at least 10 characters.')
    .max(500, 'Keep the description under 500 characters.'),
})

type BookingValues = z.infer<typeof bookingSchema>

export function BookAppointmentPage() {
  useDocumentMeta({
    title: 'Book an appointment | AmazeCare',
    description: 'Choose a live slot and tell the clinic what brings you in.',
    robots: 'noindex,nofollow',
  })

  const { doctorId } = useParams<{ doctorId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const clinic = useClinic()

  const doctor = clinic.state.doctors.find((item) => item.id === doctorId)
  const specialization = doctor
    ? clinic.getSpecialization(doctor.specializationId)
    : undefined
  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )

  const dates = useMemo(() => getNextDays(14), [])
  const nextAvailable = useMemo(() => {
    if (!doctor) return null
    for (const date of dates) {
      const slots = getAvailableSlotsForDoctor(
        doctor,
        date,
        clinic.state.appointments,
      )
      if (slots.length > 0) return { date, time: slots[0] }
    }
    return null
  }, [doctor, dates, clinic.state.appointments])

  const dateParam = searchParams.get('date')
  const timeParam = searchParams.get('time')
  const initialDate =
    dateParam && dates.includes(dateParam)
      ? dateParam
      : (nextAvailable?.date ?? dates[0])
  const initialTime =
    dateParam === initialDate && timeParam
      ? timeParam
      : nextAvailable?.date === initialDate
        ? nextAvailable.time
        : ''

  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedTime, setSelectedTime] = useState(initialTime)
  const [step, setStep] = useState<1 | 2>(1)

  const availableDates = useMemo(() => {
    const set = new Set<string>()
    if (!doctor) return set
    dates.forEach((date) => {
      if (
        getAvailableSlotsForDoctor(
          doctor,
          date,
          clinic.state.appointments,
        ).length > 0
      ) {
        set.add(date)
      }
    })
    return set
  }, [doctor, dates, clinic.state.appointments])

  const slots = useMemo(
    () =>
      doctor
        ? getAvailableSlotsForDoctor(
            doctor,
            selectedDate,
            clinic.state.appointments,
          )
        : [],
    [doctor, selectedDate, clinic.state.appointments],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { natureOfVisit: 'New consultation', symptoms: '' },
  })

  if (!doctor || !patient) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="That doctor is not available"
        description="The profile may have moved, or the doctor is no longer taking appointments. Browse the full team instead."
        action={
          <Link to="/patient/doctors" className={buttonStyles()}>
            Find a doctor
          </Link>
        }
      />
    )
  }

  const chooseDate = (date: string) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  const goToDetails = () => {
    if (!selectedTime) return
    setStep(2)
  }

  const onSubmit = async (values: BookingValues) => {
    if (!selectedTime) {
      setStep(1)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
    const appointment = clinic.createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      date: selectedDate,
      time: selectedTime,
      symptoms: values.symptoms,
      natureOfVisit: values.natureOfVisit,
    })
    toast.success('Appointment requested. Your doctor will confirm shortly.')
    navigate(`/patient/appointments/${appointment.id}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/patient/doctors"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to doctors
        </Link>
      </div>

      <PageHeader
        title="Book an appointment"
        description={`Choose a slot with ${doctor.name} and tell the clinic what brings you in.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ol className="flex flex-wrap items-center gap-3">
            {[
              { number: 1, label: 'Choose a slot' },
              { number: 2, label: 'Visit details' },
            ].map((item) => {
              const active = step === item.number
              const complete = step > item.number
              return (
                <li key={item.number} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.number === 1) setStep(1)
                      if (item.number === 2 && selectedTime) setStep(2)
                    }}
                    aria-current={active ? 'step' : undefined}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs',
                        active || complete
                          ? 'bg-primary text-white'
                          : 'bg-surface text-muted ring-1 ring-line',
                      )}
                    >
                      {complete ? '✓' : item.number}
                    </span>
                    <span
                      className={cn(
                        'caption-1',
                        active ? 'text-ink' : 'text-muted',
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                  {item.number === 1 ? (
                    <span className="h-px w-6 bg-line" aria-hidden="true" />
                  ) : null}
                </li>
              )
            })}
          </ol>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            {step === 1 ? (
              <div className="flex flex-col gap-5">
                <SlotPicker
                  dates={dates}
                  date={selectedDate}
                  onDateChange={chooseDate}
                  slots={slots}
                  time={selectedTime}
                  onTimeChange={setSelectedTime}
                  availableDates={availableDates}
                />

                <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="caption-5 text-muted">
                    Your slot is held only after you confirm the appointment.
                  </p>
                  <Button
                    type="button"
                    onClick={goToDetails}
                    disabled={!selectedTime}
                  >
                    Continue to visit details
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
              >
                <div className="flex flex-col gap-1">
                  <h2 className="title-1 text-ink">Tell us about the visit</h2>
                  <p className="body-6 text-muted">
                    A little context helps the doctor prepare before you arrive.
                  </p>
                </div>

                <SelectField
                  label="Nature of visit"
                  options={[
                    { value: 'New consultation', label: 'New consultation' },
                    { value: 'Follow up', label: 'Follow up' },
                    { value: 'Second opinion', label: 'Second opinion' },
                  ]}
                  error={errors.natureOfVisit?.message}
                  required
                  {...register('natureOfVisit')}
                />

                <TextAreaField
                  label="What brings you in?"
                  placeholder="Describe the symptoms, how long they have been present, and anything you have already tried."
                  hint="Up to 500 characters."
                  error={errors.symptoms?.message}
                  required
                  {...register('symptoms')}
                />

                <div className="rounded-lg bg-paper p-4">
                  <p className="caption-4 text-muted">Patient details</p>
                  <div className="mt-2 flex flex-col gap-1">
                    <p className="body-5 text-ink">{patient.name}</p>
                    <p className="caption-5 text-muted">
                      {getAge(patient.dob)} years. {patient.phone}.{' '}
                      {patient.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to slots
                  </button>
                  <Button type="submit" isLoading={isSubmitting}>
                    Request appointment
                  </Button>
                </div>
                <p className="caption-5 text-muted">
                  You will get a confirmation once the doctor accepts the
                  request. You can cancel or reschedule from your appointments.
                </p>
              </form>
            )}
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="slip lg:sticky lg:top-24">
            <div className="slip-inner flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <p className="caption-4 text-muted">Appointment summary</p>
                <h2 className="heading-5 text-ink">Your visit</h2>
              </div>

              <div className="flex items-start gap-3">
                <Avatar name={doctor.name} size="md" />
                <div className="min-w-0">
                  <p className="title-2 text-ink">{doctor.name}</p>
                  <p className="caption-5 text-muted">
                    {specialization?.name ?? doctor.designation}
                  </p>
                  <p className="mt-1 caption-5 text-muted">
                    {doctor.qualification}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg bg-paper p-3">
                <span className="flex items-center gap-2 body-6 text-ink">
                  <CalendarBlank
                    className="h-4 w-4 text-muted"
                    aria-hidden="true"
                  />
                  {formatDateLong(selectedDate)}
                </span>
                <span className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
                  <Clock className="h-4 w-4 text-muted" aria-hidden="true" />
                  {selectedTime ? formatTime(selectedTime) : 'Choose a time'}
                </span>
              </div>

              <dl className="flex flex-col gap-2 border-t border-line pt-4">
                <div className="flex items-center justify-between gap-3">
                  <dt className="caption-5 text-muted">Consultation fee</dt>
                  <dd className="body-4 font-mono text-ink">
                    {formatCurrency(doctor.fee)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="caption-5 text-muted">Payment</dt>
                  <dd className="body-6 text-ink">At the clinic</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="caption-5 text-muted">Status</dt>
                  <dd className="body-6 text-ink">Pending confirmation</dd>
                </div>
              </dl>

              <p className="caption-5 text-muted">
                AmazeCare Clinic, 4th Floor, 12th Main Road, Indiranagar,
                Bengaluru.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
