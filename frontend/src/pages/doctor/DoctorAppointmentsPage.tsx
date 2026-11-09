import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
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
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { Button, buttonStyles } from '../../components/ui/Button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs'
import { apiErrorMessage } from '../../lib/api'
import { getAge, pluralize } from '../../lib/format'
import {
  formatDayNumber,
  formatMonthShort,
  formatTime,
  formatWeekday,
  todayISO,
} from '../../lib/date'
import { getPastAppointments, getUpcomingAppointments } from '../../lib/selectors'
import type { Appointment } from '../../types'

function AppointmentRow({
  appointment,
  mode,
}: {
  appointment: Appointment
  mode: 'request' | 'upcoming' | 'completed' | 'cancelled'
}) {
  const clinic = useClinic()
  const patient = clinic.getPatient(appointment.patientId)
  if (!patient) return null

  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
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
          <p className="title-2 text-ink">{patient.name}</p>
          <p className="caption-5 text-muted">
            {getAge(patient.dob)} years. {patient.gender}.{' '}
            {appointment.natureOfVisit}
          </p>
          <p className="mt-1 line-clamp-1 body-6 text-muted">
            {appointment.symptoms}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-col sm:items-end">
          <StatusChip status={appointment.status} />
          <div className="flex items-center gap-2">
            {mode === 'request' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    try {
                      await clinic.confirmAppointment(appointment.id)
                      toast.success('Appointment confirmed.')
                    } catch (error) {
                      toast.error(apiErrorMessage(error))
                    }
                  }}
                >
                  Confirm
                </Button>
                <Link
                  to={`/doctor/appointments/${appointment.id}`}
                  className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                >
                  Review
                </Link>
              </>
            ) : mode === 'upcoming' ? (
              <>
                <Link
                  to={`/doctor/appointments/${appointment.id}/consult`}
                  className={buttonStyles({ size: 'sm' })}
                >
                  Start consultation
                </Link>
                <Link
                  to={`/doctor/appointments/${appointment.id}`}
                  className="link text-sm"
                >
                  View
                </Link>
              </>
            ) : (
              <Link
                to={`/doctor/appointments/${appointment.id}`}
                className="link text-sm"
              >
                View
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export function DoctorAppointmentsPage() {
  useDocumentMeta({
    title: 'Appointments | AmazeCare Doctor',
    description: 'Review requests and manage your clinic schedule.',
    robots: 'noindex,nofollow',
  })

  const { user } = useAuth()
  const clinic = useClinic()
  const [query, setQuery] = useState('')

  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)

  if (!doctor) {
    return (
      <EmptyState
        icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
        title="Schedule not found"
        description="The doctor record for this sign in could not be found."
      />
    )
  }

  const appointments = clinic.getDoctorAppointments(doctor.id)
  const upcoming = getUpcomingAppointments(appointments)
  const requests = upcoming.filter(
    (appointment) => appointment.status === 'pending',
  )
  const confirmed = upcoming.filter(
    (appointment) => appointment.status === 'confirmed',
  )
  const completed = appointments
    .filter((appointment) => appointment.status === 'completed')
    .slice()
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  const cancelled = getPastAppointments(appointments).filter(
    (appointment) =>
      appointment.status === 'cancelled' || appointment.status === 'rejected',
  )

  const normalized = query.trim().toLowerCase()
  const filterList = (list: Appointment[]) =>
    list.filter((appointment) => {
      if (!normalized) return true
      const patient = clinic.getPatient(appointment.patientId)
      return [patient?.name ?? '', appointment.symptoms, appointment.natureOfVisit]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    })

  const filteredRequests = filterList(requests)
  const filteredConfirmed = filterList(confirmed)
  const filteredCompleted = filterList(completed)
  const filteredCancelled = filterList(cancelled)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Appointments"
        description={`${requests.length} ${pluralize(
          requests.length,
          'request',
        )} waiting for a decision. ${confirmed.length} confirmed ${
          confirmed.length === 1 ? 'visit' : 'visits'
        } ahead.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search patient or visit type"
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

      <Tabs defaultValue="requests">
        <TabsList ariaLabel="Appointment views">
          <TabsTrigger value="requests">
            Requests{' '}
            <span className="ml-1 caption-5 text-muted">
              {filteredRequests.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming{' '}
            <span className="ml-1 caption-5 text-muted">
              {filteredConfirmed.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed{' '}
            <span className="ml-1 caption-5 text-muted">
              {filteredCompleted.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled{' '}
            <span className="ml-1 caption-5 text-muted">
              {filteredCancelled.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {filteredRequests.length > 0 ? (
            <>
              <p className="mb-3 caption-4 text-muted">
                Confirm a request to add it to the clinic day. Reject with a
                reason if the slot cannot be kept.
              </p>
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {filteredRequests.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    mode="request"
                  />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
              title="No requests waiting"
              description="New patient requests will appear here for confirmation."
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {filteredConfirmed.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {filteredConfirmed.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  mode="upcoming"
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarBlank className="h-6 w-6" aria-hidden="true" />}
              title="No confirmed visits"
              description="Confirmed appointments will appear here in date order."
            />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {filteredCompleted.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {filteredCompleted.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  mode="completed"
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CheckCircle className="h-6 w-6" aria-hidden="true" />}
              title="No completed visits"
              description="Completed consultations and their records will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {filteredCancelled.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {filteredCancelled.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  mode="cancelled"
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarX className="h-6 w-6" aria-hidden="true" />}
              title="No cancelled visits"
              description="Cancelled and rejected appointments will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
