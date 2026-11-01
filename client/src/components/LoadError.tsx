// Error state for a data view that failed to load, with a way to try again.
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LoadError({ what, message, onRetry }: { what: string; message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-subtle p-5">
      <p className="flex items-center gap-2 font-semibold text-destructive">
        <AlertTriangle aria-hidden="true" className="size-4" />
        Couldn’t load {what}
      </p>
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}
