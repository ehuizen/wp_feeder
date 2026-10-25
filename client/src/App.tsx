import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

type Health = { ok: boolean }

type HealthState =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'error'; message: string }

export function App() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    api<Health>('/health')
      .then(() => {
        if (!cancelled) setHealth({ status: 'ok' })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (!cancelled) setHealth({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold text-primary">WPFeeder</h1>

      <div className="mt-4" aria-live="polite">
        {health.status === 'loading' && (
          <>
            <Skeleton className="h-5 w-40" />
            <span className="sr-only">Checking server…</span>
          </>
        )}
        {health.status === 'ok' && (
          <p className="font-medium text-success">Server: OK</p>
        )}
        {health.status === 'error' && (
          <p className="font-medium text-destructive">
            Server: unreachable ({health.message})
          </p>
        )}
      </div>
    </main>
  )
}
