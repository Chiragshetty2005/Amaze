import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle,
  MapPin,
  Stethoscope,
  WarningCircle,
} from '@phosphor-icons/react'
import { useClinic } from '../contexts/ClinicContext'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { Avatar } from '../components/ui/Avatar'
import { Button, buttonStyles } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SlotPicker } from '../components/ui/SlotPicker'
import { formatCurrency } from '../lib/format'
import { formatNextSlot } from '../lib/slots'
import { getNextDays } from '../lib/date'
import { getAreasOfCare, clinicAddress } from '../lib/specialtyDetails'

export function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const clinic = useClinic()
  const { user } = useAuth()
  const navigate = useNavigate()

  const doctor = clinic.state.doctors.find((item) => item.id === id)
  const specialization = doctor
    ? clinic.state.specializations.find(
        (item) => item.id === doctor.specializationId,
      )
    : undefined

  const nextAvailable = doctor
    ? clinic.getNextAvailableSlot(doctor.id)
    : null
  const defaultDate = nextAvailable?.date ?? getNextDays(1)[0]

  const dates = useMemo(() => getNextDays(7), [])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [selectedTime, setSelectedTime] = useState('')

  const availableDates = useMemo(() => {
    const set = new Set<string>()
    if (!doctor) return set
    dates.forEach((date) => {
      if (clinic.getAvailableSlotsForDoctor(doctor.id, date).length > 0) {
        set.add(date)
      }
    })
    return set
  }, [doctor, dates, clinic])

  useEffect(() => {
    setSelectedTime('')
  }, [selectedDate])

  useDocumentMeta({
    title: doctor
      ? `${doctor.name} | ${specialization?.name ?? 'Specialist'} | AmazeCare`
      : 'Doctor not found | AmazeCare',
    description: doctor
      ? `${doctor.name}, ${doctor.qualification}, ${doctor.experienceYears} years of experience. Book a live appointment at AmazeCare.`
      : 'The doctor you are looking for is not listed at AmazeCare.',
    robots: doctor ? 'index,follow' : 'noindex,follow',
  })

  if (!doctor) {
    return (
      <div className="container-page pt-24">
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
          title="This doctor is not listed"
          description="The profile may have moved, or the doctor is no longer taking appointments. Browse the full team instead."
          action={
            <Link to="/find-a-doctor" className={buttonStyles()}>
              Find a doctor
            </Link>
          }
        />
      </div>
    )
  }

  const slots = clinic.getAvailableSlotsForDoctor(doctor.id, selectedDate)
  const areas = getAreasOfCare(doctor.specializationId)
  const relatedDoctors = clinic.state.doctors
    .filter(
      (item) =>
        item.specializationId === doctor.specializationId &&
        item.id !== doctor.id,
    )
    .slice(0, 2)

  const goToBooking = () => {
    if (!selectedTime) return
    const target = `/patient/book/${doctor.id}?date=${selectedDate}&time=${selectedTime}`
    if (user?.role === 'patient') {
      navigate(target)
    } else {
      navigate(`/login?redirect=${encodeURIComponent(target)}`)
    }
  }

  return (
    <>
      <section className="bg-mint pb-8 pt-20 lg:pb-10 lg:pt-24">
        <div className="container-page">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 caption-2 text-ink/70"
          >
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/find-a-doctor" className="hover:text-ink">
              Find a doctor
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              {doctor.name}
            </span>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar
                name={doctor.name}
                photoUrl={doctor.photoUrl}
                size="xl"
                className="ring-4 ring-surface"
              />
              <div className="flex flex-col gap-1">
                <h1 className="heading-3 text-ink">{doctor.name}</h1>
                <p className="title-2 text-ink/70">
                  {specialization?.name ?? 'General Medicine'}
                </p>
                <p className="body-6 text-ink/70">{doctor.qualification}</p>
                <p className="body-6 text-ink/70">{doctor.designation}</p>
              </div>
            </div>

            <dl className="flex flex-wrap gap-8">
              <div>
                <dt className="caption-5 text-ink/70">Experience</dt>
                <dd className="title-1 text-ink">
                  {doctor.experienceYears} years
                </dd>
              </div>
              <div>
                <dt className="caption-5 text-ink/70">Consultation</dt>
                <dd className="title-1 font-mono text-ink">
                  {formatCurrency(doctor.fee)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page grid gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="order-2 min-w-0 flex flex-col gap-10 lg:order-1 lg:col-span-2">
            <section className="flex flex-col gap-3">
              <h2 className="heading-5 text-ink">About {doctor.name}</h2>
              <p className="max-w-2xl body-3 text-muted">{doctor.bio}</p>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="heading-5 text-ink">Areas of care</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {areas.map((area) => (
                  <li
                    key={area}
                    className="flex items-start gap-2 body-6 text-ink"
                  >
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {area}
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="heading-5 text-ink">
                What your consultation includes
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  'A physical exam and a full history.',
                  'A written diagnosis and treatment plan.',
                  'Any tests ordered during the visit.',
                  'Prescription and invoice in your record.',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 body-6 text-ink"
                  >
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card-flat flex flex-col gap-4">
              <h2 className="title-1 text-ink">Before your visit</h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {[
                  'Arrive 10 minutes before your slot.',
                  'Bring a photo ID and any previous prescriptions.',
                  'Wear a mask if you have a cough or fever.',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 body-6 text-ink/70"
                  >
                    <CheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {relatedDoctors.length > 0 ? (
              <section className="flex flex-col gap-4">
                <h2 className="heading-5 text-ink">
                  Other specialists in {specialization?.name ?? 'this department'}
                </h2>
                <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                  {relatedDoctors.map((related) => {
                    const relatedSlot = clinic.getNextAvailableSlot(related.id)
                    return (
                      <li
                        key={related.id}
                        className="border-t border-line first:border-t-0"
                      >
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={related.name} size="md" />
                            <div className="min-w-0">
                              <p className="title-3 truncate text-ink">
                                {related.name}
                              </p>
                              <p className="caption-5 text-muted">
                                {related.experienceYears} years.{' '}
                                {relatedSlot
                                  ? formatNextSlot(relatedSlot)
                                  : 'No open slots in two weeks'}
                              </p>
                            </div>
                          </div>
                          <Link
                            to={`/doctors/${related.id}`}
                            className={buttonStyles({
                              variant: 'secondary',
                              size: 'sm',
                            })}
                          >
                            View profile
                          </Link>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="order-1 min-w-0 lg:order-2 lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <div className="card flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <p className="caption-4 text-muted">Book a consultation</p>
                <h2 className="heading-5 text-ink">Choose a slot</h2>
                <p className="body-6 text-muted">
                  Consultation fee {formatCurrency(doctor.fee)}.
                </p>
              </div>

              <SlotPicker
                dates={dates}
                date={selectedDate}
                onDateChange={setSelectedDate}
                slots={slots}
                time={selectedTime}
                onTimeChange={setSelectedTime}
                availableDates={availableDates}
              />

              {nextAvailable && !selectedTime ? (
                <p className="caption-5 text-muted">
                  Next open: {formatNextSlot(nextAvailable)}
                </p>
              ) : null}

              <Button
                className="w-full"
                disabled={!selectedTime}
                onClick={goToBooking}
              >
                Continue to book
              </Button>
              <p className="text-center caption-5 text-muted">
                You will confirm the slot after signing in.
              </p>
              <p className="text-center caption-5 text-muted">
                No account?{' '}
                <Link to="/register" className="link text-sm">
                  Create one
                </Link>
              </p>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface p-4">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <p className="title-4 text-ink">{clinicAddress.name}</p>
                {clinicAddress.lines.map((line) => (
                  <p key={line} className="caption-5 text-muted">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <p className="mt-4 flex items-start gap-2 caption-5 text-muted">
              <WarningCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              For a medical emergency, call 112.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
