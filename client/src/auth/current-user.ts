import { createContext, useContext } from 'react'

export type CurrentUser = { id: string; email: string | null; name: string | null }

// null = no provider above. Only AuthGate provides it, and only once signed in.
export const CurrentUserContext = createContext<CurrentUser | null>(null)

export function useCurrentUser(): CurrentUser {
  const user = useContext(CurrentUserContext)
  if (user === null) throw new Error('useCurrentUser must be used inside AuthGate')
  return user
}
