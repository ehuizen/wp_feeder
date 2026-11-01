// A labelled form input with an optional hint and error message, wired up for screen readers.
import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

type FormFieldProps = { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="font-semibold">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-message`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
