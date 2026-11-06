import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  Flask,
  Pill,
  Stethoscope,
} from '@phosphor-icons/react'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusChip } from '../../components/ui/StatusChip'
import { buttonStyles } from '../../components/ui/Button'
import {
  formatDateLong,
  formatDateShort,
  formatTime,
} from '../../lib/date'
import {
  formatCurrency,
  getDosageLabel,
} from '../../lib/format'

export function PatientRecordDetailPage() {
  useDocumentMeta({
    title: 'Consultation record | AmazeCare',
    description: 'Diagnosis, treatment plan, tests, and prescription.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const clinic = useClinic()

  const patient = clinic.state.patients.find(
    (item) => item.userId === user?.id,
  )
  const consultation = clinic.state.consultations.find(
    (item) => item.id === id,
  )
  const appointment = consultation
    ? clinic.state.appointments.find(
        (item) => item.id === consultation.appointmentId,
      )
    : undefined
  const allowed =
    Boolean(patient) &&
    Boolean(appointment) &&
    appointment?.patientId === patient?.id
  const doctor = appointment
    ? clinic.getDoctor(appointment.doctorId)
    : undefined
  const specialization = doctor
    ? clinic.getSpecialization(doctor.specializationId)
    : undefined

  if (!allowed || !consultation || !appointment || !doctor) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="Record not found"
        description="This consultation does not belong to your account, or it may have been removed."
        action={
          <Link to="/patient/records" className={buttonStyles()}>
            Back to records
          </Link>
        }
      />
    )
  }

  const tests = consultation.testIds.flatMap((testId) => {
    const test = clinic.getTest(testId)
    return test ? [test] : []
  })
  const testsTotal = tests.reduce((sum, test) => sum + test.price, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/patient/records"
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to records
        </Link>
      </div>

      <PageHeader
        title="Consultation record"
        description={`${doctor.name}, ${specialization?.name ?? doctor.designation}. ${formatDateLong(appointment.date)}.`}
        actions={
          <Link
            to={`/patient/book/${doctor.id}`}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Book follow up
          </Link>
        }
      />

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={appointment.status} />
          <p className="caption-5 text-muted">
            <span className="font-mono">
              {formatDateShort(appointment.date)}
            </span>{' '}
            at <span className="font-mono">{formatTime(appointment.time)}</span>
          </p>
        </div>
        <p className="mt-4 caption-4 text-muted">Diagnosis</p>
        <h2 className="mt-1 heading-4 text-ink">{consultation.diagnosis}</h2>
        <p className="mt-3 max-w-3xl body-3 text-muted">
          {consultation.treatmentPlan}
        </p>
        <p className="mt-4 caption-5 text-muted">
          Record ID{' '}
          <span className="font-mono text-ink">
            {consultation.id.toUpperCase()}
          </span>
        </p>
      </section>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        <section className="bg-surface p-5">
          <h2 className="title-1 text-ink">Symptoms</h2>
          <p className="mt-2 body-6 text-muted">{consultation.symptoms}</p>
        </section>
        <section className="bg-surface p-5">
          <h2 className="title-1 text-ink">Physical exam</h2>
          <p className="mt-2 body-6 text-muted">
            {consultation.physicalExam}
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Flask className="h-5 w-5 text-muted" aria-hidden="true" />
          <h2 className="heading-5 text-ink">Tests ordered</h2>
        </div>
        {tests.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Test</th>
                    <th scope="col">Price</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.id}>
                      <td className="font-medium">{test.name}</td>
                      <td className="font-mono">
                        {formatCurrency(test.price)}
                      </td>
                      <td className="text-muted">Ordered</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="caption-5 text-muted">
              Tests total{' '}
              <span className="font-mono text-ink">
                {formatCurrency(testsTotal)}
              </span>
              . These charges appear on your invoice.
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="body-6 text-muted">No tests were ordered at this visit.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-muted" aria-hidden="true" />
          <h2 className="heading-5 text-ink">Prescription</h2>
        </div>

        {consultation.prescription.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="table min-w-[640px]">
                <thead>
                  <tr>
                    <th scope="col">Medicine</th>
                    <th scope="col">Dosage</th>
                    <th scope="col">Food</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultation.prescription.map((item) => {
                    const medicine = clinic.getMedicine(item.medicineId)
                    return (
                      <tr key={item.id}>
                        <td>
                          <p className="font-medium">{item.medicineName}</p>
                          <p className="caption-5 text-muted">
                            {medicine
                              ? `${medicine.form}, ${medicine.strength}`
                              : ''}
                          </p>
                        </td>
                        <td className="font-mono">
                          {getDosageLabel(
                            item.morning,
                            item.afternoon,
                            item.night,
                            item.foodRelation,
                          )}
                        </td>
                        <td>
                          {item.foodRelation === 'AF'
                            ? 'After food'
                            : 'Before food'}
                        </td>
                        <td>{item.durationDays} days</td>
                        <td className="text-muted">{item.instructions}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-mint p-3 body-6 text-ink/70">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              Take each medicine exactly as prescribed. Call the clinic if you
              notice a reaction or the symptoms get worse.
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="body-6 text-muted">
              No medicines were prescribed at this visit.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
