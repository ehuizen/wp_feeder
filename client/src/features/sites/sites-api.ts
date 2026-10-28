// Browser side of the sites API: one function per /api/sites call.
import { api } from '@/lib/api'

export type SiteStatus = 'ok' | 'failing'

// Dates arrive as ISO strings because JSON has no Date type.
export type Site = {
  id: string
  name: string
  baseUrl: string
  wpUsername: string
  status: SiteStatus
  lastVerifiedAt: string | null
  createdAt: string
}

export type NewSite = { name: string; baseUrl: string; wpUsername: string; appPassword: string }

export type SiteChanges = Partial<Omit<NewSite, 'baseUrl'>>

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

export const listSites = () => api<Site[]>('/sites')

export const createSite = (site: NewSite) =>
  api<Site>('/sites', { method: 'POST', ...json(site) })

export const updateSite = (id: string, changes: SiteChanges) =>
  api<Site>(`/sites/${id}`, { method: 'PATCH', ...json(changes) })

export const verifySite = (id: string) => api<Site>(`/sites/${id}/verify`, { method: 'POST' })

export const removeSite = (id: string) => api<void>(`/sites/${id}`, { method: 'DELETE' })
