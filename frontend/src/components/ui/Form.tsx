import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface FieldShellProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('field', className)}>
      <label className="label" htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  containerClassName?: string
  endAdornment?: ReactNode
}

export function TextField({
  label,
  error,
  hint,
  id,
  className,
  containerClassName,
  required,
  endAdornment,
  ...props
}: TextFieldProps) {
  const fallbackId = useId()
  const fieldId = id ?? fallbackId
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined

  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <div className="relative">
        <input
          id={fieldId}
          className={cn('input', endAdornment && 'pr-12', className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          {...props}
        />
        {endAdornment ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            {endAdornment}
          </span>
        ) : null}
      </div>
    </FieldShell>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  containerClassName?: string
}

export function TextAreaField({
  label,
  error,
  hint,
  id,
  className,
  containerClassName,
  required,
  ...props
}: TextAreaFieldProps) {
  const fallbackId = useId()
  const fieldId = id ?? fallbackId
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined

  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <textarea
        id={fieldId}
        className={cn('input min-h-24 resize-y', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        {...props}
      />
    </FieldShell>
  )
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  hint?: string
  containerClassName?: string
}

export function SelectField({
  label,
  options,
  placeholder,
  error,
  hint,
  id,
  className,
  containerClassName,
  required,
  ...props
}: SelectFieldProps) {
  const fallbackId = useId()
  const fieldId = id ?? fallbackId
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined

  return (
    <FieldShell
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <select
        id={fieldId}
        className={cn('input appearance-none', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
