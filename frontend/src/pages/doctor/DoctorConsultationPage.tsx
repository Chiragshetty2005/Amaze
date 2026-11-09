import { useMemo, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  CheckCircle,
  Flask,
  Plus,
  Stethoscope,
  X,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button, buttonStyles } from '../../components/ui/Button'
import { TextAreaField } from '../../components/ui/Form'
import { apiErrorMessage } from '../../lib/api'
import { getAge, getDosageLabel, formatCurrency } from '../../lib/format'
import {
  formatDateLong,
  formatTime,
} from '../../lib/date'
import { cn } from '../../lib/cn'

const consultationSchema = z.object({
  symptoms: z
    .string()
    .trim()
    .min(5, 'Record the symptoms in at least 5 characters.')
    .max(1000, 'Keep the symptoms under 1000 characters.'),
  physicalExam: z
    .string()
    .trim()
    .min(5, 'Record the physical exam findings.')
    .max(1000, 'Keep the exam notes under 1000 characters.'),
  diagnosis: z
    .string()
    .trim()
    .min(3, 'Enter a working diagnosis.')
    .max(300, 'Keep the diagnosis under 300 characters.'),
  treatmentPlan: z
    .string()
    .trim()
    .min(5, 'Record the treatment plan.')
    .max(1200, 'Keep the plan under 1200 characters.'),
})

type ConsultationValues = z.infer<typeof consultationSchema>

interface PrescriptionDraft {
  key: string
  medicineId: string
  morning: number
  afternoon: number
  night: number
  foodRelation: 'AF' | 'BF'
  durationDays: number
  instructions: string
}

function newKey(): string {
  return Math.random().toString(36).slice(2, 10)
}

function freshPrescription(): PrescriptionDraft {
  return {
    key: newKey(),
    medicineId: '',
    morning: 1,
    afternoon: 0,
    night: 1,
    foodRelation: 'AF',
    durationDays: 5,
    instructions: '',
  }
}

export function DoctorConsultationPage() {
  useDocumentMeta({
    title: 'Consultation | AmazeCare Doctor',
    description: 'Record clinical notes, tests, and the prescription.',
    robots: 'noindex,nofollow',
  })

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const clinic = useClinic()

  const doctor = clinic.state.doctors.find((item) => item.userId === user?.id)
  const appointment = clinic.state.appointments.find((item) => item.id === id)
  const allowed =
    Boolean(doctor) && Boolean(appointment) && appointment?.doctorId === doctor?.id
  const patient = appointment
    ? clinic.getPatient(appointment.patientId)
    : undefined

  const [drafts, setDrafts] = useState<PrescriptionDraft[]>([
    freshPrescription(),
  ])
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [prescriptionError, setPrescriptionError] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      symptoms: appointment?.symptoms ?? '',
      physicalExam: '',
      diagnosis: '',
      treatmentPlan: '',
    },
  })

  const selectedTestList = useMemo(
    () => clinic.state.tests.filter((test) => selectedTests.has(test.id)),
    [clinic.state.tests, selectedTests],
  )
  const testsTotal = selectedTestList.reduce((sum, test) => sum + test.price, 0)
  const subtotal = (doctor?.fee ?? 0) + testsTotal
  const tax = Math.round(subtotal * 0.05)

  if (!allowed || !appointment || !doctor || !patient) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="Consultation not available"
        description="This appointment is not on your schedule, or it may have been removed."
        action={
          <Link to="/doctor/appointments" className={buttonStyles()}>
            Back to appointments
          </Link>
        }
      />
    )
  }

  if (appointment.status === 'pending') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Consultation"
          description={`${patient.name}. ${formatDateLong(
            appointment.date,
          )} at ${formatTime(appointment.time)}.`}
        />
        <div className="card-flat flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="title-2 text-ink">Confirm this appointment first</h2>
          </div>
          <p className="body-6 text-ink/70">
            A consultation can start once the request is confirmed. The patient
            will see the confirmation immediately.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={async () => {
                try {
                  await clinic.confirmAppointment(appointment.id)
                  toast.success(
                    'Appointment confirmed. You can start the consultation.',
                  )
                } catch (error) {
                  toast.error(apiErrorMessage(error))
                }
              }}
            >
              Confirm appointment
            </Button>
            <Link
              to={`/doctor/appointments/${appointment.id}`}
              className={buttonStyles({ variant: 'secondary' })}
            >
              Back to appointment
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (appointment.status === 'completed') {
    return (
      <EmptyState
        icon={<CheckCircle className="h-6 w-6" aria-hidden="true" />}
        title="This consultation is complete"
        description="The note and invoice are on the appointment page. Open it to review or print the record."
        action={
          <Link
            to={`/doctor/appointments/${appointment.id}`}
            className={buttonStyles()}
          >
            View appointment
          </Link>
        }
      />
    )
  }

  if (appointment.status === 'cancelled' || appointment.status === 'rejected') {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" aria-hidden="true" />}
        title="This appointment is closed"
        description="A consultation cannot be started for a cancelled or rejected visit."
        action={
          <Link to="/doctor/appointments" className={buttonStyles()}>
            Back to appointments
          </Link>
        }
      />
    )
  }

  const updateDraft = (key: string, patch: Partial<PrescriptionDraft>) => {
    setDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
    setPrescriptionError('')
  }

  const toggleTest = (testId: string) => {
    setSelectedTests((current) => {
      const next = new Set(current)
      if (next.has(testId)) next.delete(testId)
      else next.add(testId)
      return next
    })
  }

  const onSubmit = async (values: ConsultationValues) => {
    clearErrors('root')
    setPrescriptionError('')

    if (drafts.some((draft) => !draft.medicineId)) {
      setPrescriptionError('Choose a medicine for each prescription row.')
      return
    }
    if (drafts.some((draft) => draft.durationDays < 1)) {
      setPrescriptionError('Set a duration of at least one day for every medicine.')
      return
    }

    const prescription = drafts.map((draft) => {
      const medicine = clinic.getMedicine(draft.medicineId)
      return {
        medicineId: draft.medicineId,
        medicineName: medicine?.name ?? '',
        morning: draft.morning,
        afternoon: draft.afternoon,
        night: draft.night,
        foodRelation: draft.foodRelation,
        durationDays: draft.durationDays,
        instructions: draft.instructions.trim(),
      }
    })

    try {
      await clinic.completeConsultation(appointment.id, {
        symptoms: values.symptoms,
        physicalExam: values.physicalExam,
        treatmentPlan: values.treatmentPlan,
        diagnosis: values.diagnosis,
        testIds: Array.from(selectedTests),
        prescription,
      })
    } catch (error) {
      setError('root', { message: apiErrorMessage(error) })
      return
    }

    toast.success('Consultation saved. The invoice is ready.')
    navigate(`/doctor/appointments/${appointment.id}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`/doctor/appointments/${appointment.id}`}
          className="inline-flex items-center gap-2 caption-4 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to appointment
        </Link>
      </div>

      <PageHeader
        title="Consultation"
        description={`${patient.name}. ${formatDateLong(
          appointment.date,
        )} at ${formatTime(appointment.time)}.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          className="flex flex-col gap-6 lg:col-span-2"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 className="title-1 text-ink">Clinical notes</h2>
              <p className="body-6 text-muted">
                Record what you observed and the plan you agreed with the
                patient.
              </p>
            </div>

            {errors.root ? (
              <div
                className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 body-6 text-danger"
                role="alert"
              >
                {errors.root.message}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4">
              <TextAreaField
                label="Symptoms"
                placeholder="What the patient reported, including duration and severity."
                error={errors.symptoms?.message}
                required
                {...register('symptoms')}
              />
              <TextAreaField
                label="Physical exam"
                placeholder="Vitals, observations, and relevant examination findings."
                error={errors.physicalExam?.message}
                required
                {...register('physicalExam')}
              />
              <TextAreaField
                label="Diagnosis"
                placeholder="Working diagnosis or assessment."
                error={errors.diagnosis?.message}
                required
                {...register('diagnosis')}
              />
              <TextAreaField
                label="Treatment plan"
                placeholder="Advice, follow up, lifestyle changes, and red flags to watch for."
                error={errors.treatmentPlan?.message}
                required
                {...register('treatmentPlan')}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Flask className="h-5 w-5 text-muted" aria-hidden="true" />
                  <h2 className="title-1 text-ink">Tests ordered</h2>
                </div>
                <p className="mt-1 body-6 text-muted">
                  Selected tests are added to the invoice automatically.
                </p>
              </div>
              <p className="caption-4 text-muted">
                {selectedTests.size} selected.{' '}
                <span className="font-mono text-ink">
                  {formatCurrency(testsTotal)}
                </span>
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {clinic.state.tests.map((test) => (
                <label
                  key={test.id}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-300 ease-out-expo',
                    selectedTests.has(test.id)
                      ? 'border-primary/30 bg-mint'
                      : 'border-line bg-surface hover:bg-paper',
                  )}
                >
                  <span className="flex items-center gap-2 body-6 text-ink">
                    <input
                      type="checkbox"
                      checked={selectedTests.has(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="h-4 w-4 rounded border-line accent-primary"
                    />
                    {test.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {formatCurrency(test.price)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="title-1 text-ink">Prescription</h2>
                <p className="mt-1 body-6 text-muted">
                  Use the three part dosage and choose before or after food.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDrafts((current) => [...current, freshPrescription()])
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add medicine
              </Button>
            </div>

            {prescriptionError ? (
              <div
                className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 body-6 text-danger"
                role="alert"
              >
                {prescriptionError}
              </div>
            ) : null}

            {drafts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center">
                <p className="body-6 text-muted">
                  No medicines added. Add one if a prescription is needed.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {drafts.map((draft, index) => {
                  const medicine = clinic.getMedicine(draft.medicineId)
                  return (
                    <div
                      key={draft.key}
                      className="rounded-xl border border-line bg-paper/60 p-4"
                    >
                      <div className="flex items-start gap-2">
                        <label className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="caption-5 text-muted">
                            Medicine {index + 1}
                          </span>
                          <select
                            value={draft.medicineId}
                            onChange={(event) =>
                              updateDraft(draft.key, {
                                medicineId: event.target.value,
                              })
                            }
                            className="input"
                            aria-label={`Medicine ${index + 1}`}
                            required
                          >
                            <option value="">Choose a medicine</option>
                            {clinic.state.medicines.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.strength})
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((current) =>
                              current.filter((item) => item.key !== draft.key),
                            )
                          }
                          className="icon-btn mt-5 shrink-0 text-muted hover:bg-danger/10 hover:text-danger"
                          aria-label={`Remove medicine ${index + 1}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {(
                          [
                            ['morning', 'Morning'],
                            ['afternoon', 'Afternoon'],
                            ['night', 'Night'],
                          ] as const
                        ).map(([field, label]) => (
                          <label key={field} className="flex flex-col gap-1">
                            <span className="caption-5 text-muted">{label}</span>
                            <input
                              type="number"
                              min={0}
                              max={3}
                              value={draft[field]}
                              onChange={(event) =>
                                updateDraft(draft.key, {
                                  [field]: Math.max(
                                    0,
                                    Math.min(3, Number(event.target.value)),
                                  ),
                                })
                              }
                              className="input text-center font-mono"
                              aria-label={`${label} dose for medicine ${index + 1}`}
                            />
                          </label>
                        ))}

                        <label className="flex flex-col gap-1">
                          <span className="caption-5 text-muted">Food</span>
                          <select
                            value={draft.foodRelation}
                            onChange={(event) =>
                              updateDraft(draft.key, {
                                foodRelation: event.target.value as 'AF' | 'BF',
                              })
                            }
                            className="input"
                            aria-label={`Food relation for medicine ${index + 1}`}
                          >
                            <option value="AF">AF</option>
                            <option value="BF">BF</option>
                          </select>
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="caption-5 text-muted">Days</span>
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={draft.durationDays}
                            onChange={(event) =>
                              updateDraft(draft.key, {
                                durationDays: Math.max(
                                  1,
                                  Math.min(90, Number(event.target.value)),
                                ),
                              })
                            }
                            className="input text-center font-mono"
                            aria-label={`Duration in days for medicine ${index + 1}`}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-col gap-1">
                        <label
                          className="caption-5 text-muted"
                          htmlFor={`instructions-${draft.key}`}
                        >
                          Instructions
                        </label>
                        <input
                          id={`instructions-${draft.key}`}
                          type="text"
                          value={draft.instructions}
                          onChange={(event) =>
                            updateDraft(draft.key, {
                              instructions: event.target.value,
                            })
                          }
                          placeholder="For example, after breakfast and dinner"
                          className="input"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-medium text-primary">
                          {getDosageLabel(
                            draft.morning,
                            draft.afternoon,
                            draft.night,
                            draft.foodRelation,
                          )}
                        </span>
                        <span className="caption-5 text-muted">
                          {medicine
                            ? `${medicine.form}, ${medicine.strength}`
                            : 'Choose a medicine to preview the label.'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md caption-5 text-muted">
              Finalizing marks the visit complete, shares the record with the
              patient, and creates the invoice.
            </p>
            <Button type="submit" isLoading={isSubmitting}>
              Finalize consultation
            </Button>
          </div>
        </form>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start gap-3">
              <Avatar name={patient.name} size="lg" />
              <div className="min-w-0">
                <h2 className="title-1 text-ink">{patient.name}</h2>
                <p className="caption-5 text-muted">
                  {getAge(patient.dob)} years. {patient.gender}.
                </p>
                <p className="caption-5 text-muted">{patient.phone}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              <p className="caption-5 text-muted">Appointment</p>
              <p className="body-5 text-ink">
                {formatDateLong(appointment.date)}
              </p>
              <p className="flex items-center gap-1 font-mono text-sm text-ink">
                <span className="font-sans text-muted">at</span>
                {formatTime(appointment.time)}
              </p>
              <p className="caption-5 text-muted">{appointment.natureOfVisit}</p>
            </div>
            <Link
              to={`/doctor/patients/${patient.id}`}
              className="link mt-3 inline-flex text-sm"
            >
              Open patient record
            </Link>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="title-1 text-ink">Invoice preview</h2>
            <dl className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 body-6 text-muted">
                <dt>Consultation</dt>
                <dd className="font-mono text-ink">
                  {formatCurrency(doctor.fee)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 body-6 text-muted">
                <dt>Tests ({selectedTests.size})</dt>
                <dd className="font-mono text-ink">
                  {formatCurrency(testsTotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2 body-6 text-muted">
                <dt>Tax at 5%</dt>
                <dd className="font-mono text-ink">{formatCurrency(tax)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <dt className="title-2 text-ink">Total</dt>
                <dd className="font-mono text-xl font-medium text-ink">
                  {formatCurrency(subtotal + tax)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 caption-5 text-muted">
              Payment is collected at the clinic. The invoice is issued when the
              consultation is finalized.
            </p>
          </section>

          <div className="card-flat">
            <div className="flex items-center gap-2">
              <CheckCircle
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              <p className="title-2 text-ink">Before you finalize</p>
            </div>
            <ul className="mt-2 flex flex-col gap-1 body-6 text-ink/70">
              <li>Check the dosage on every medicine.</li>
              <li>Confirm the food relation for each row.</li>
              <li>Review the tests added to the bill.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
