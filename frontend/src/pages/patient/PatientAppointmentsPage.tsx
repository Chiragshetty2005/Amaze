import { Link } from 'react-router-dom'
import {
  CalendarBlank,
  CalendarX,
  CheckCircle,
  Clock,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs'
import { pluralize } from '../../lib/format'
import {
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
} from '../../lib/date'
import {
  getPastAppointments,
  getUpcomingAppointments,
} from '../../lib/selectors'
import type { Appointment } from '../../types'

function AppointmentListItem({
  appointment,
  hasRecord,
}: {
  appointment: Appointment
  hasRecord: boolean
}) {
  const clinic = useClinic()
  const doctor = clinic.getDoctor(appointment.doctorId)
  const specialization = doctor
    ? clinic.getSpecialization(doctor.specializationId)
    : undefined
  if (!doctor) return null

  return (
    <li className="border-t border-line first:border-t-0">
      <Link
        to={`/patient/appointments/${appointment.id}`}
        className="flex flex-col gap-4 p-4 transition-colors duration-300 ease-out-expo hover:bg-paper sm:flex-row sm:items-center sm:p-5"
      >
        <div className="flex w-full shrink-0 items-center gap-3 rounded-lg bg-paper p-3 sm:w-28 sm:flex-col sm:justify-center sm:gap-0">
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
          <p className="title-2 text-ink">{doctor.name}</p>
          <p className="caption-2 text-muted">
            {specialization?.name ?? doctor.designation}
          </p>
          <p className="mt-1 line-clamp-1 body-6 text-muted">
            {appointment.symptoms}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
          <StatusChip status={appointment.status} />
          <span className="caption-4 text-primary">
            {hasRecord ? 'View record' : 'View appointment'}
          </span>
        </div>
      </Link>
    </li>
  )
}

export function PatientAppointmentsPage() {
  useDocumentMeta({
    title: 'Appointments | AmazeCare',
    description: 'Manage upcoming, completed, and cancelled appointments.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()
  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )

  if (!patient) {
    return (
      <EmptyState
        icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
        title="Appointments are unavailable"
        description="The patient record for this sign in could not be found."
      />
    )
  }

  const appointments = clinic.getPatientAppointments(patient.id)
  const upcoming = getUpcomingAppointments(appointments)
  const completed = appointments
    .filter((appointment) => appointment.status === 'completed')
    .slice()
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  const cancelled = getPastAppointments(appointments).filter(
    (appointment) =>
      appointment.status === 'cancelled' || appointment.status === 'rejected',
  )

  const countFor = (list: Appointment[]) => list.length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description="Upcoming visits, completed consultations, and anything you cancelled."
        actions={
          <Link to="/patient/doctors" className={buttonStyles()}>
            Book appointment
          </Link>
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming{' '}
            <span className="ml-1 caption-5 text-muted">
              {countFor(upcoming)}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed{' '}
            <span className="ml-1 caption-5 text-muted">
              {countFor(completed)}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled{' '}
            <span className="ml-1 caption-5 text-muted">
              {countFor(cancelled)}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcoming.length > 0 ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="caption-4 text-muted">
                  {upcoming.length}{' '}
                  {pluralize(upcoming.length, 'visit')} ahead
                </p>
                <p className="caption-5 text-muted">
                  Pending visits need doctor confirmation.
                </p>
              </div>
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {upcoming.map((appointment) => (
                  <AppointmentListItem
                    key={appointment.id}
                    appointment={appointment}
                    hasRecord={Boolean(
                      clinic.getConsultationForAppointment(appointment.id),
                    )}
                  />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
              title="No upcoming appointments"
              description="Find a specialist and choose a slot from their live availability."
              action={
                <Link to="/patient/doctors" className={buttonStyles()}>
                  Find a doctor
                </Link>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {completed.map((appointment) => (
                <AppointmentListItem
                  key={appointment.id}
                  appointment={appointment}
                  hasRecord={Boolean(
                    clinic.getConsultationForAppointment(appointment.id),
                  )}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CheckCircle className="h-6 w-6" aria-hidden="true" />}
              title="No completed visits yet"
              description="Your consultation notes will live here after your first completed visit."
            />
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelled.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {cancelled.map((appointment) => (
                <AppointmentListItem
                  key={appointment.id}
                  appointment={appointment}
                  hasRecord={false}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
              title="Nothing cancelled"
              description="Cancelled and rejected appointments will appear here with their reason."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
