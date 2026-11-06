import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl border border-line bg-surface text-ink shadow-slip font-sans',
          title: 'text-sm font-semibold text-ink',
          description: 'text-sm text-muted',
          actionButton: 'btn btn-primary button-sm',
          cancelButton: 'btn btn-secondary button-sm',
          closeButton: 'border-line bg-surface text-muted',
        },
      }}
    />
  )
}
