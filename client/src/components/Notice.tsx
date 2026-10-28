// A short status message that screen readers announce. Stands in for a toast without a toast library.
import { cn } from '@/lib/utils'

export function Notice({ message, tone = 'default' }: { message: string; tone?: 'default' | 'danger' }) {
  return (
    <p
      aria-live="polite"
      className={cn(
        message ? 'mb-4 rounded-lg border bg-card px-4 py-3 text-sm' : 'sr-only',
        tone === 'danger' && 'border-destructive/30 bg-destructive-subtle text-destructive',
      )}
    >
      {message}
    </p>
  )
}
