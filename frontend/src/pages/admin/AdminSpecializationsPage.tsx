import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Buildings, Plus, Stethoscope } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { TextAreaField, TextField } from '../../components/ui/Form'
import { apiErrorMessage } from '../../lib/api'
import { pluralize } from '../../lib/format'
import type { Specialization } from '../../types'

const specializationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the department name.')
    .max(80, 'Keep the name under 80 characters.'),
  description: z
    .string()
    .trim()
    .min(10, 'Write at least 10 characters for the description.')
    .max(240, 'Keep the description under 240 characters.'),
})

type SpecializationValues = z.infer<typeof specializationSchema>

export function AdminSpecializationsPage() {
  useDocumentMeta({
    title: 'Departments | AmazeCare Admin',
    description: 'Manage the clinic departments used for search and reports.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Specialization | null>(null)
  const [toDelete, setToDelete] = useState<Specialization | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpecializationValues>({
    resolver: zodResolver(specializationSchema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (!editorOpen) return
    reset({
      name: editing?.name ?? '',
      description: editing?.description ?? '',
    })
  }, [editorOpen, editing, reset])

  const openNew = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const openEdit = (specialization: Specialization) => {
    setEditing(specialization)
    setEditorOpen(true)
  }

  const onSubmit = async (values: SpecializationValues) => {
    try {
      if (editing) {
        await clinic.updateSpecialization(editing.id, values)
        toast.success('Department updated.')
      } else {
        await clinic.addSpecialization(values)
        toast.success('Department added.')
      }
      setEditorOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const linkedDoctors = toDelete
    ? clinic.state.doctors.filter(
        (doctor) => doctor.specializationId === toDelete.id,
      )
    : []

  const confirmDelete = async () => {
    if (!toDelete || linkedDoctors.length > 0) return
    try {
      await clinic.deleteSpecialization(toDelete.id)
      toast.success(`${toDelete.name} was removed.`)
      setToDelete(null)
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  const specializations = clinic.state.specializations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Departments"
        description={`${specializations.length} ${pluralize(
          specializations.length,
          'department',
        )} used across doctor search and reports.`}
        actions={
          <Button type="button" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add department
          </Button>
        }
      />

      {specializations.length === 0 ? (
        <EmptyState
          icon={<Buildings className="h-6 w-6" aria-hidden="true" />}
          title="No departments yet"
          description="Add a department before adding doctors to the clinic."
          action={
            <Button type="button" onClick={openNew}>
              Add department
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {specializations.map((specialization) => {
            const doctorCount = clinic.state.doctors.filter(
              (doctor) => doctor.specializationId === specialization.id,
            ).length
            return (
              <li
                key={specialization.id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="title-1 text-ink">{specialization.name}</h2>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paper px-2.5 py-1 caption-5 text-muted">
                    <Stethoscope
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {doctorCount} {pluralize(doctorCount, 'doctor')}
                  </span>
                </div>
                <p className="body-6 text-muted">{specialization.description}</p>
                <div className="mt-auto flex items-center justify-end gap-2 border-t border-line pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(specialization)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => setToDelete(specialization)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) setEditing(null)
        }}
        title={editing ? 'Edit department' : 'Add department'}
        description="Departments group doctors and shape the public search filters."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditorOpen(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="department-form"
              isLoading={isSubmitting}
            >
              {editing ? 'Save department' : 'Add department'}
            </Button>
          </>
        }
      >
        <form
          id="department-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <TextField
            label="Department name"
            placeholder="For example, Cardiology"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <TextAreaField
            label="Description"
            placeholder="A short description of the care offered."
            error={errors.description?.message}
            required
            {...register('description')}
          />
        </form>
      </Modal>

      <Modal
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={`Remove ${toDelete?.name ?? 'this department'}?`}
        description={
          linkedDoctors.length > 0
            ? 'This department is still in use.'
            : 'This department has no doctors linked to it.'
        }
        footer={
          linkedDoctors.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setToDelete(null)}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setToDelete(null)}
              >
                Keep department
              </Button>
              <Button type="button" variant="danger" onClick={confirmDelete}>
                Remove department
              </Button>
            </>
          )
        }
      >
        {linkedDoctors.length > 0 ? (
          <div className="rounded-lg border border-coral/30 bg-coral/5 p-4 body-6 text-ink/75">
            <p>
              {toDelete?.name} has {linkedDoctors.length}{' '}
              {pluralize(linkedDoctors.length, 'doctor')}. Move{' '}
              {linkedDoctors.length === 1 ? 'that doctor' : 'those doctors'} to
              another department before removing this one.
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-ink">
              {linkedDoctors.map((doctor) => (
                <li key={doctor.id}>{doctor.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="body-6 text-ink/70">
            Removing an empty department cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  )
}
