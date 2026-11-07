import { Link } from 'react-router-dom'
import { CalendarBlank, CheckCircle } from '@phosphor-icons/react'
import { Avatar } from '../ui/Avatar'
import { StatusChip } from '../ui/StatusChip'
import { buttonStyles } from '../ui/Button'
import { doctors } from '../../mocks/data'
import { addDaysISO, formatDateShort, formatTime } from '../../lib/date'

const boardRows = [
  {
    day: formatDateShort(addDaysISO(1)),
    time: '09:30',
    doctor: 'Dr. Poornima C',
    department: 'Obstetrics and Gynecology',
  },
  {
    day: formatDateShort(addDaysISO(1)),
    time: '10:15',
    doctor: 'Dr. Arjun Rao',
    department: 'Cardiology',
  },
  {
    day: formatDateShort(addDaysISO(2)),
    time: '11:00',
    doctor: 'Dr. Kavya Menon',
    department: 'Dermatology',
  },
]

function ClinicBoard() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-md sm:max-w-lg lg:max-w-none">
      <div className="slip bg-mint shadow-slip">
        <div className="slip-inner flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="caption-4 text-muted">This week at AmazeCare</p>
              <p className="title-1 text-ink">Clinic board</p>
            </div>
            <span className="status-chip status-confirmed">
              <span
                className="h-2 w-2 rounded-full bg-current"
                aria-hidden="true"
              />
              Live
            </span>
          </div>

          <ul className="overflow-hidden rounded-lg border border-line bg-surface">
            {boardRows.map((row, index) => (
              <li
                key={`${row.doctor}-${row.time}`}
                className="board-row grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-line p-3 first:border-t-0 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="w-20 shrink-0">
                  <p className="caption-5 text-muted">{row.day}</p>
                  <p className="body-4 whitespace-nowrap font-mono text-ink">
                    {formatTime(row.time)}
                  </p>
                </div>
                <Avatar
                  name={row.doctor}
                  size="sm"
                  className="hidden sm:inline-flex"
                />
                <div className="min-w-0">
                  <p className="title-4 truncate text-ink">{row.doctor}</p>
                  <p className="caption-5 truncate text-muted">
                    {row.department}
                  </p>
                </div>
                <StatusChip
                  status="confirmed"
                  className="col-span-2 justify-self-end sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:justify-self-auto"
                />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2">
            <CalendarBlank
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <p className="caption-5 text-muted">Next open slot</p>
              <p className="body-4 font-mono text-ink">
                Tomorrow at 10:30
              </p>
            </div>
            <span className="ml-auto flex items-center gap-2 caption-5 text-success">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              3 open slots
            </span>
          </div>

          <p className="caption-5 text-muted">
            A preview of the clinic board. Availability updates live in the app.
          </p>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden bg-paper bg-[url('/landing-poster.jpg')] bg-cover bg-center pb-12 pt-20 lg:pb-16 lg:pt-24"
    >
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        src="/LandingPage.mp4"
        poster="/landing-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-paper/75 lg:bg-paper/55"
      />

      <div className="container-page relative grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <h1 className="heading-display hero-heading max-w-hero">
            See the right specialist,
            <span className="block">without the wait.</span>
          </h1>
          <p className="max-w-hero body-3 text-muted">
            Search by department, choose a live slot, and keep every
            prescription, test, and bill in one place.
          </p>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link to="/find-a-doctor" className={buttonStyles()}>
              Book an appointment
            </Link>
            <a
              href="#how-it-works"
              className="body-5 inline-flex items-center px-3 py-2 text-muted transition-colors duration-300 ease-out-expo hover:text-ink"
            >
              See how it works
            </a>
          </div>
          <p className="caption-2 text-muted">
            No phone calls. No card required.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center -space-x-2">
              {doctors.slice(0, 3).map((doctor) => (
                <Avatar
                  key={doctor.id}
                  name={doctor.name}
                  size="sm"
                  className="ring-2 ring-paper"
                />
              ))}
            </div>
            <p className="body-6 text-muted">
              Live availability with 11 specialists across 8 departments.
            </p>
          </div>
        </div>

        <ClinicBoard />
      </div>
    </section>
  )
}
