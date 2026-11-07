import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flask, Pill, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../contexts/ClinicContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { SelectField, TextField } from '../../components/ui/Form'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/Tabs'
import { formatCurrency, pluralize } from '../../lib/format'
import type { MedicalTest, Medicine } from '../../types'

const medicineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the medicine name.')
    .max(100, 'Keep the name under 100 characters.'),
  form: z.string().min(1, 'Choose a form.'),
  strength: z
    .string()
    .trim()
    .min(1, 'Enter the strength.')
    .max(40, 'Keep the strength under 40 characters.'),
})

const testSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the test name.')
    .max(100, 'Keep the name under 100 characters.'),
  price: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter the price in whole rupees.')
    .refine(
      (value) => Number(value) >= 0 && Number(value) <= 100000,
      'Enter a price between 0 and 100,000.',
    ),
})

type MedicineValues = z.infer<typeof medicineSchema>
type TestValues = z.infer<typeof testSchema>

type DeleteTarget = {
  kind: 'medicine' | 'test'
  id: string
  name: string
  used: number
}

export function AdminCatalogPage() {
  useDocumentMeta({
    title: 'Medicines and tests | AmazeCare Admin',
    description: 'Manage the medicines and tests available to doctors.',
    robots: 'noindex,nofollow',
  })

  const clinic = useClinic()
  const [tab, setTab] = useState<'medicines' | 'tests'>('medicines')
  const [query, setQuery] = useState('')
  const [medicineEditorOpen, setMedicineEditorOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [testEditorOpen, setTestEditorOpen] = useState(false)
  const [editingTest, setEditingTest] = useState<MedicalTest | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const medicineForm = useForm<MedicineValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: { name: '', form: 'Tablet', strength: '' },
  })
  const testForm = useForm<TestValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { name: '', price: '' },
  })
  const resetMedicineForm = medicineForm.reset
  const resetTestForm = testForm.reset

  useEffect(() => {
    if (!medicineEditorOpen) return
    resetMedicineForm({
      name: editingMedicine?.name ?? '',
      form: editingMedicine?.form ?? 'Tablet',
      strength: editingMedicine?.strength ?? '',
    })
  }, [medicineEditorOpen, editingMedicine, resetMedicineForm])

  useEffect(() => {
    if (!testEditorOpen) return
    resetTestForm({
      name: editingTest?.name ?? '',
      price: String(editingTest?.price ?? ''),
    })
  }, [testEditorOpen, editingTest, resetTestForm])

  const normalized = query.trim().toLowerCase()
  const medicines = clinic.state.medicines
    .filter((medicine) =>
      [medicine.name, medicine.form, medicine.strength]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  const tests = clinic.state.tests
    .filter((test) => test.name.toLowerCase().includes(normalized))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  const medicineUsage = (medicineId: string) =>
    clinic.state.consultations.reduce(
      (sum, consultation) =>
        sum +
        consultation.prescription.filter(
          (item) => item.medicineId === medicineId,
        ).length,
      0,
    )

  const testUsage = (testId: string) =>
    clinic.state.consultations.filter((consultation) =>
      consultation.testIds.includes(testId),
    ).length

  const openNew = () => {
    if (tab === 'medicines') {
      setEditingMedicine(null)
      setMedicineEditorOpen(true)
    } else {
      setEditingTest(null)
      setTestEditorOpen(true)
    }
  }

  const onSaveMedicine = async (values: MedicineValues) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (editingMedicine) {
      clinic.updateMedicine(editingMedicine.id, values)
      toast.success('Medicine updated.')
    } else {
      clinic.addMedicine(values)
      toast.success('Medicine added.')
    }
    setMedicineEditorOpen(false)
    setEditingMedicine(null)
  }

  const onSaveTest = async (values: TestValues) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (editingTest) {
      clinic.updateTest(editingTest.id, {
        name: values.name.trim(),
        price: Number(values.price),
      })
      toast.success('Test updated.')
    } else {
      clinic.addTest({
        name: values.name.trim(),
        price: Number(values.price),
      })
      toast.success('Test added.')
    }
    setTestEditorOpen(false)
    setEditingTest(null)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'medicine') {
      clinic.deleteMedicine(deleteTarget.id)
    } else {
      clinic.deleteTest(deleteTarget.id)
    }
    toast.success(`${deleteTarget.name} was removed from the catalog.`)
    setDeleteTarget(null)
  }

  const list = tab === 'medicines' ? medicines : tests

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Medicines and tests"
        description={`${clinic.state.medicines.length} medicines and ${clinic.state.tests.length} tests available in consultations.`}
        actions={
          <Button type="button" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {tab === 'medicines' ? 'Add medicine' : 'Add test'}
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as 'medicines' | 'tests')
          setQuery('')
        }}
        mode="filter"
      >
        <TabsList ariaLabel="Catalog section">
          <TabsTrigger value="medicines">
            Medicines{' '}
            <span className="ml-1 caption-5 text-muted">
              {clinic.state.medicines.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tests">
            Tests{' '}
            <span className="ml-1 caption-5 text-muted">
              {clinic.state.tests.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={
            tab === 'medicines'
              ? 'Search medicines'
              : 'Search tests'
          }
          ariaLabel={
            tab === 'medicines' ? 'Search medicines' : 'Search medical tests'
          }
          className="sm:max-w-md"
        />
        <p className="caption-4 text-muted" aria-live="polite">
          {list.length} {pluralize(list.length, 'item')}
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={
            tab === 'medicines' ? (
              <Pill className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Flask className="h-6 w-6" aria-hidden="true" />
            )
          }
          title={
            query
              ? 'No catalog item matches'
              : tab === 'medicines'
                ? 'No medicines yet'
                : 'No tests yet'
          }
          description={
            query
              ? 'Try a different name, form, or strength.'
              : 'Add an item so doctors can use it in consultations.'
          }
          action={!query ? <Button type="button" onClick={openNew}>Add item</Button> : undefined}
        />
      ) : tab === 'medicines' ? (
        <div
          className="table-wrap"
          role="region"
          aria-label="Medicines"
          tabIndex={0}
        >
          <table className="table min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">Medicine</th>
                <th scope="col">Form</th>
                <th scope="col">Strength</th>
                <th scope="col">Prescribed</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((medicine) => {
                const used = medicineUsage(medicine.id)
                return (
                  <tr key={medicine.id}>
                    <td className="font-medium text-ink">{medicine.name}</td>
                    <td>{medicine.form}</td>
                    <td className="font-mono">{medicine.strength}</td>
                    <td>
                      {used} {pluralize(used, 'time')}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingMedicine(medicine)
                            setMedicineEditorOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'medicine',
                              id: medicine.id,
                              name: medicine.name,
                              used,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="table-wrap"
          role="region"
          aria-label="Tests"
          tabIndex={0}
        >
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Price</th>
                <th scope="col">Ordered</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => {
                const used = testUsage(test.id)
                return (
                  <tr key={test.id}>
                    <td className="font-medium text-ink">{test.name}</td>
                    <td className="font-mono">{formatCurrency(test.price)}</td>
                    <td>
                      {used} {pluralize(used, 'time')}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingTest(test)
                            setTestEditorOpen(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'test',
                              id: test.id,
                              name: test.name,
                              used,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption-5 text-muted">
        Medicines keep the name they had when prescribed. Removing a test may
        leave older records without its current label.
      </p>

      <Modal
        open={medicineEditorOpen}
        onOpenChange={(open) => {
          setMedicineEditorOpen(open)
          if (!open) setEditingMedicine(null)
        }}
        title={editingMedicine ? 'Edit medicine' : 'Add medicine'}
        description="Doctors use this catalog when writing prescriptions."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMedicineEditorOpen(false)
                setEditingMedicine(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="medicine-form"
              isLoading={medicineForm.formState.isSubmitting}
            >
              {editingMedicine ? 'Save medicine' : 'Add medicine'}
            </Button>
          </>
        }
      >
        <form
          id="medicine-form"
          className="flex flex-col gap-4"
          onSubmit={medicineForm.handleSubmit(onSaveMedicine)}
          noValidate
        >
          <TextField
            label="Medicine name"
            placeholder="For example, Ferrous fumarate"
            error={medicineForm.formState.errors.name?.message}
            required
            {...medicineForm.register('name')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Form"
              options={[
                'Tablet',
                'Capsule',
                'Syrup',
                'Injection',
                'Ointment',
                'Drops',
                'Inhaler',
                'Powder',
              ].map((form) => ({ value: form, label: form }))}
              error={medicineForm.formState.errors.form?.message}
              required
              {...medicineForm.register('form')}
            />
            <TextField
              label="Strength"
              placeholder="500 mg"
              error={medicineForm.formState.errors.strength?.message}
              required
              {...medicineForm.register('strength')}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={testEditorOpen}
        onOpenChange={(open) => {
          setTestEditorOpen(open)
          if (!open) setEditingTest(null)
        }}
        title={editingTest ? 'Edit test' : 'Add test'}
        description="Tests are added to the invoice when a doctor orders them."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTestEditorOpen(false)
                setEditingTest(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="test-form"
              isLoading={testForm.formState.isSubmitting}
            >
              {editingTest ? 'Save test' : 'Add test'}
            </Button>
          </>
        }
      >
        <form
          id="test-form"
          className="flex flex-col gap-4"
          onSubmit={testForm.handleSubmit(onSaveTest)}
          noValidate
        >
          <TextField
            label="Test name"
            placeholder="For example, Thyroid profile"
            error={testForm.formState.errors.name?.message}
            required
            {...testForm.register('name')}
          />
          <TextField
            label="Price (INR)"
            type="number"
            min={0}
            max={100000}
            inputMode="numeric"
            error={testForm.formState.errors.price?.message}
            required
            {...testForm.register('price')}
          />
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Remove ${deleteTarget?.name ?? 'this item'}?`}
        description={
          deleteTarget?.used
            ? `This item appears in ${deleteTarget.used} ${
                deleteTarget.used === 1 ? 'clinical record' : 'clinical records'
              }.`
            : 'This catalog item is not used in any clinical record yet.'
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Keep item
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete}>
              Remove item
            </Button>
          </>
        }
      >
        <p className="body-6 text-ink/70">
          {deleteTarget?.kind === 'medicine'
            ? 'Saved prescriptions keep the medicine name and dosage exactly as written.'
            : 'Existing consultation records may no longer show the current label for this test.'}
        </p>
      </Modal>
    </div>
  )
}
