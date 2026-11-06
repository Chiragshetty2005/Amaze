import { useId, useRef, useState, type DragEvent } from 'react'
import { Camera, Trash, UploadSimple } from '@phosphor-icons/react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

interface FileUploadProps {
  label: string
  value?: string
  onChange: (value: string | undefined) => void
  hint?: string
  error?: string
  onError?: (message: string) => void
}

const MAX_SIZE = 2 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function FileUpload({
  label,
  value,
  onChange,
  hint,
  error,
  onError,
}: FileUploadProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const readFile = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      onError?.('Use a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_SIZE) {
      onError?.('That file is over 2 MB. Choose a smaller image.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result))
    reader.readAsDataURL(file)
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) readFile(file)
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div
        className={cn(
          'flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line bg-paper p-4 sm:flex-row sm:items-center',
          dragging && 'border-primary bg-mint',
        )}
      >
        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface">
          {value ? (
            <img
              src={value}
              alt="Profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-6 w-6 text-muted" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-1 flex-col gap-2">
          <p className="body-6 text-muted">
            {hint ?? 'JPEG, PNG, or WebP. Up to 2 MB.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <UploadSimple className="h-4 w-4" aria-hidden="true" />
              {value ? 'Replace photo' : 'Upload photo'}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(undefined)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <label
          htmlFor={id}
          className="sr-only"
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          Upload {label.toLowerCase()}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPTED.join(',')}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) readFile(file)
            event.target.value = ''
          }}
        />
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
