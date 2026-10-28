// Loads one thing from the API and tracks data / loading / error, with reload() for after a change.
import { useCallback, useEffect, useState } from 'react'

export type Resource<T> = {
  data: T
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  setData: (data: T) => void
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

// `load` must be stable (a module-level function, or wrapped in useCallback), or this refetches every render.
export function useResource<T>(load: () => Promise<T>, initial: T): Resource<T> {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ignore a slow answer that arrives after the page has moved on (e.g. a different post id).
    let cancelled = false
    load()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageOf(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const reload = useCallback(async () => {
    try {
      setData(await load())
      setError(null)
    } catch (err) {
      setError(messageOf(err))
    }
  }, [load])

  return { data, loading, error, reload, setData }
}
