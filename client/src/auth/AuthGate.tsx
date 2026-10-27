import { useEffect, useState, type ReactNode } from 'react'
import { CurrentUserContext, type CurrentUser } from '@/auth/current-user'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { SignInPage } from '@/pages/SignInPage'

type AuthState =
  | { status: 'checking' }
  | { status: 'signedIn'; user: CurrentUser }
  | { status: 'signedOut' }
  | { status: 'error'; message: string } // the server is down, not a 401

// One call to /api/me decides what the whole app shows.
export function AuthGate({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false

    api<CurrentUser>('/me', undefined, { redirectOn401: false })
      .then((user) => {
        if (!cancelled) setAuth({ status: 'signedIn', user })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          setAuth({ status: 'signedOut' })
        } else {
          setAuth({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  switch (auth.status) {
    case 'checking':
      return (
        <div className="flex min-h-svh items-center justify-center" aria-live="polite">
          <Skeleton className="h-8 w-48" />
          <span className="sr-only">Checking your session…</span>
        </div>
      )
    case 'signedOut':
      return <SignInPage />
    case 'error':
      return (
        <main className="flex min-h-svh items-center justify-center p-8">
          <p role="alert" className="font-medium text-destructive">
            Can’t reach WPFeeder right now ({auth.message}). Refresh to try again.
          </p>
        </main>
      )
    case 'signedIn':
      return <CurrentUserContext.Provider value={auth.user}>{children}</CurrentUserContext.Provider>
  }
}
