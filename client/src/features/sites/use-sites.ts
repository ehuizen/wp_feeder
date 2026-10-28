// Loads the user's sites for the Sites page and lets it reload them after a change.
import { listSites, type Site } from '@/features/sites/sites-api'
import { useResource } from '@/lib/use-resource'

export function useSites() {
  return useResource<Site[]>(listSites, [])
}

export function needsAttention(sites: Site[]): Site[] {
  return sites.filter((site) => site.status === 'failing')
}
