import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarBlank,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { buttonStyles } from '../../components/ui/Button'
import { SpecialtyIcon } from '../../components/landing/SpecialtyIcon'
import { formatCurrency, pluralize } from '../../lib/format'
import { formatTime, relativeDayLabel } from '../../lib/date'
import { getNextAvailableSlot, type AvailableSlot } from '../../lib/slots'
import { cn } from '../../lib/cn'
import type { Doctor } from '../../types'

type SortOption = 'soonest' | 'fee' | 'experience'

function DoctorRow({
  doctor,
  specialtyName,
  nextSlot,
}: {
  doctor: Doctor
  specialtyName: string
  nextSlot: AvailableSlot | null
}) {
  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex flex-col gap-4 p-4 transition-colors duration-300 ease-out-expo hover:bg-paper/70 sm:p-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-center gap-4 lg:w-[36%]">
          <Avatar name={doctor.name} size="lg" />
          <div className="min-w-0">
            <p className="title-1 truncate text-ink">{doctor.name}</p>
            <p className="inline-flex items-center gap-2 caption-2 text-muted">
              <SpecialtyIcon
                id={doctor.specializationId}
                className="h-4 w-4 text-primary"
              />
              {specialtyName}
            </p>
            <p className="caption-5 text-muted">{doctor.qualification}</p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="caption-5 text-muted">Consultation</dt>
            <dd className="body-4 font-mono text-ink">
              {formatCurrency(doctor.fee)}
            </dd>
          </div>
          <div>
            <dt className="caption-5 text-muted">Experience</dt>
            <dd className="body-5 text-ink">{doctor.experienceYears} years</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="caption-5 text-muted">Next available</dt>
            {nextSlot ? (
              <dd className="flex items-start gap-2">
                <CalendarBlank
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span className="body-5 text-ink">
                    {relativeDayLabel(nextSlot.date)}
                  </span>
                  <span className="body-4 font-mono text-ink">
                    {formatTime(nextSlot.time)}
                  </span>
                </span>
              </dd>
            ) : (
              <dd className="body-5 text-muted">No slots in two weeks</dd>
            )}
          </div>
        </dl>

        <Link
          to={`/patient/book/${doctor.id}`}
          className={buttonStyles({ size: 'sm', className: 'lg:shrink-0' })}
        >
          Choose slot
        </Link>
      </div>
    </li>
  )
}

export function PatientDoctorsPage() {
  useDocumentMeta({
    title: 'Find a doctor | AmazeCare',
    description: 'Search specialists and choose a live appointment slot.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('soonest')

  const specialtyId = searchParams.get('specialty') ?? 'all'

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
    return clinic.state.doctors
      .filter((doctor) => {
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
        return (
          matchesDepartment && (!normalized || haystack.includes(normalized))
        )
      })
      .slice()
      .sort((a, b) => {
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Find a doctor"
        description="Search by department, compare experience, and choose a live slot."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name, department, or qualification"
            ariaLabel="Search doctors"
            className="flex-1"
          />
          <label className="flex items-center gap-2 caption-4 text-muted">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="input w-auto"
            >
              <option value="soonest">Soonest available</option>
              <option value="fee">Lowest fee</option>
              <option value="experience">Most experience</option>
            </select>
          </label>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setDepartment('all')}
            aria-pressed={specialtyId === 'all'}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 button-sm transition-colors duration-300 ease-out-expo',
              specialtyId === 'all'
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-muted hover:bg-mint hover:text-ink',
            )}
          >
            All departments
          </button>
          {clinic.state.specializations.map((specialization) => (
            <button
              key={specialization.id}
              type="button"
              onClick={() => setDepartment(specialization.id)}
              aria-pressed={specialtyId === specialization.id}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 button-sm transition-colors duration-300 ease-out-expo',
                specialtyId === specialization.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-line bg-surface text-muted hover:bg-mint hover:text-ink',
              )}
            >
              {specialization.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="body-5 text-muted" aria-live="polite">
          {filteredDoctors.length}{' '}
          {pluralize(filteredDoctors.length, 'doctor')}
        </p>
        <p className="caption-5 text-muted">Availability is live.</p>
      </div>

      {filteredDoctors.length === 0 ? (
        <EmptyState
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
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {filteredDoctors.map((doctor) => {
            const specialization = clinic.state.specializations.find(
              (item) => item.id === doctor.specializationId,
            )
            return (
              <DoctorRow
                key={doctor.id}
                doctor={doctor}
                specialtyName={specialization?.name ?? 'General Medicine'}
                nextSlot={nextSlots.get(doctor.id) ?? null}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
