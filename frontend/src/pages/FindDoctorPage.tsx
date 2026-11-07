import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarBlank, MagnifyingGlass } from '@phosphor-icons/react'
import { useClinic } from '../contexts/ClinicContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { SearchInput } from '../components/ui/SearchInput'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { buttonStyles } from '../components/ui/Button'
import { SpecialtyIcon } from '../components/landing/SpecialtyIcon'
import { formatCurrency, pluralize } from '../lib/format'
import { getNextAvailableSlot, type AvailableSlot } from '../lib/slots'
import { formatTime, relativeDayLabel } from '../lib/date'
import { cn } from '../lib/cn'
import type { Doctor } from '../types'

type SortOption = 'soonest' | 'fee' | 'experience'

function DepartmentButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-out-expo lg:w-full',
        active
          ? 'bg-primary text-white'
          : 'text-ink hover:bg-mint',
      )}
    >
      <span className="body-5 whitespace-nowrap">{label}</span>
      <span
        className={cn(
          'caption-5',
          active ? 'text-white/85' : 'text-muted',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function DoctorRow({
  doctor,
  specialtyName,
  specialtyId,
  nextSlot,
}: {
  doctor: Doctor
  specialtyName: string
  specialtyId: string
  nextSlot: AvailableSlot | null
}) {
  return (
    <li data-scroll-card className="border-t border-line first:border-t-0">
      <div className="flex flex-col gap-4 p-4 transition-colors duration-300 ease-out-expo hover:bg-paper/70 sm:p-6 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-center gap-4 lg:w-[38%]">
          <Avatar name={doctor.name} size="lg" />
          <div className="min-w-0">
            <p className="title-1 truncate text-ink">{doctor.name}</p>
            <p className="inline-flex items-center gap-2 caption-2 text-muted">
              <SpecialtyIcon id={specialtyId} className="h-4 w-4 text-primary" />
              {specialtyName}
            </p>
            <p className="caption-5 text-muted">{doctor.qualification}</p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="caption-5 text-muted">Experience</dt>
            <dd className="body-5 text-ink">{doctor.experienceYears} years</dd>
          </div>
          <div>
            <dt className="caption-5 text-muted">Consultation</dt>
            <dd className="body-4 font-mono text-ink">
              {formatCurrency(doctor.fee)}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="caption-5 text-muted">Next available</dt>
            <dd className="flex items-start gap-2 body-5 text-ink">
              {nextSlot ? (
                <>
                  <CalendarBlank
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  <span className="flex flex-col">
                    <span>{relativeDayLabel(nextSlot.date)}</span>
                    <span className="body-4 font-mono">
                      {formatTime(nextSlot.time)}
                    </span>
                  </span>
                </>
              ) : (
                'No open slots in two weeks'
              )}
            </dd>
          </div>
        </dl>

        <div className="lg:shrink-0">
          <Link
            to={`/doctors/${doctor.id}`}
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            View slots
          </Link>
        </div>
      </div>
    </li>
  )
}

export function FindDoctorPage() {
  useDocumentMeta({
    title: 'Find a doctor | AmazeCare',
    description:
      'Search 11 specialists across 8 departments. Compare experience and consultation fees, then choose a live appointment slot.',
    robots: 'index,follow',
  })

  const clinic = useClinic()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('soonest')

  const specialtyId = searchParams.get('specialty') ?? 'all'
  const activeSpecialty = clinic.state.specializations.find(
    (specialization) => specialization.id === specialtyId,
  )

  const nextSlots = useMemo(() => {
    const map = new Map<string, AvailableSlot | null>()
    clinic.state.doctors.forEach((doctor) => {
      map.set(
        doctor.id,
        getNextAvailableSlot(doctor, clinic.state.appointments),
      )
    })
    return map
  }, [clinic.state.doctors, clinic.state.appointments])

  const filteredDoctors = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const doctors = clinic.state.doctors.filter((doctor) => {
      const specialization = clinic.state.specializations.find(
        (item) => item.id === doctor.specializationId,
      )
      const matchesDepartment =
        specialtyId === 'all' || doctor.specializationId === specialtyId
      const haystack = [
        doctor.name,
        doctor.qualification,
        doctor.designation,
        specialization?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return matchesDepartment && (!normalized || haystack.includes(normalized))
    })

    return doctors.sort((a, b) => {
      if (sort === 'fee') return a.fee - b.fee
      if (sort === 'experience') return b.experienceYears - a.experienceYears
      const aSlot = nextSlots.get(a.id)
      const bSlot = nextSlots.get(b.id)
      if (!aSlot && !bSlot) return a.name.localeCompare(b.name)
      if (!aSlot) return 1
      if (!bSlot) return -1
      return `${aSlot.date}T${aSlot.time}`.localeCompare(
        `${bSlot.date}T${bSlot.time}`,
      )
    })
  }, [
    clinic.state.doctors,
    clinic.state.specializations,
    nextSlots,
    query,
    sort,
    specialtyId,
  ])

  const setDepartment = (id: string) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'all') next.delete('specialty')
    else next.set('specialty', id)
    setSearchParams(next, { replace: true })
  }

  const clearFilters = () => {
    setQuery('')
    setSearchParams({}, { replace: true })
  }

  return (
    <>
      <section className="bg-mint pb-8 pt-20 lg:pb-12 lg:pt-24">
        <div className="container-page flex flex-col gap-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 caption-2 text-ink/70">
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              Find a doctor
            </span>
          </nav>

          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="heading-section text-ink">
              Find a doctor who fits your week.
            </h1>
            <p className="body-3 text-ink/70">
              Search by name or department, compare experience, and choose a
              live slot. No phone calls.
            </p>
          </div>

          <div className="flex max-w-2xl flex-col gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by name or department"
              ariaLabel="Search doctors"
            />
            <p className="caption-5 text-ink/70">
              11 specialists across 8 departments.
            </p>
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page grid gap-8 lg:grid-cols-4 lg:gap-12">
          <div className="min-w-0 lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-2 text-ink">Departments</h2>
              {specialtyId !== 'all' || query ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="caption-4 text-primary hover:underline"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="no-scrollbar -mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
              <DepartmentButton
                active={specialtyId === 'all'}
                label="All departments"
                count={clinic.state.doctors.length}
                onClick={() => setDepartment('all')}
              />
              {clinic.state.specializations.map((specialization) => (
                <DepartmentButton
                  key={specialization.id}
                  active={specialtyId === specialization.id}
                  label={specialization.name}
                  count={
                    clinic.state.doctors.filter(
                      (doctor) =>
                        doctor.specializationId === specialization.id,
                    ).length
                  }
                  onClick={() => setDepartment(specialization.id)}
                />
              ))}
            </div>

            <div className="card-flat mt-6 hidden lg:block">
              <p className="title-2 text-ink">Not sure where to start?</p>
              <p className="mt-2 body-6 text-ink/70">
                General Medicine is the right first stop for fever, fatigue,
                and everyday concerns.
              </p>
              <button
                type="button"
                onClick={() => setDepartment('s6')}
                className="link mt-3 inline-flex text-sm"
              >
                See General Medicine
              </button>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="body-5 text-muted" aria-live="polite">
                {filteredDoctors.length}{' '}
                {pluralize(filteredDoctors.length, 'doctor')}
                {activeSpecialty ? ` in ${activeSpecialty.name}` : ''}
              </p>
              <label className="flex items-center gap-2 caption-4 text-muted">
                Sort by
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SortOption)
                  }
                  className="input w-auto"
                >
                  <option value="soonest">Soonest available</option>
                  <option value="fee">Lowest fee</option>
                  <option value="experience">Most experience</option>
                </select>
              </label>
            </div>

            {filteredDoctors.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={<MagnifyingGlass className="h-6 w-6" aria-hidden="true" />}
                title="No doctor matches that search"
                description="Try another department, search a different name, or clear the filters to see everyone."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={buttonStyles({ variant: 'secondary' })}
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <ul className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
                {filteredDoctors.map((doctor) => {
                  const specialization = clinic.state.specializations.find(
                    (item) => item.id === doctor.specializationId,
                  )
                  return (
                    <DoctorRow
                      key={doctor.id}
                      doctor={doctor}
                      specialtyId={doctor.specializationId}
                      specialtyName={
                        specialization?.name ?? 'General Medicine'
                      }
                      nextSlot={nextSlots.get(doctor.id) ?? null}
                    />
                  )
                })}
              </ul>
            )}

            <p className="mt-4 caption-5 text-muted lg:hidden">
              Not sure where to start? General Medicine is a good first stop.{' '}
              <button
                type="button"
                onClick={() => setDepartment('s6')}
                className="link text-sm"
              >
                See General Medicine
              </button>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
