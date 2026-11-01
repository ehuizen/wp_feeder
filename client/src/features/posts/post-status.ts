// Turns a post's publication counts into the word and colour shown on its badge.
import type { StatusTone } from '@/components/StatusBadge'
import type { PublicationCounts } from '@/features/posts/posts-api'

export function postStatus(counts: PublicationCounts): { tone: StatusTone; label: string } {
  if (counts.failed > 0) return { tone: 'danger', label: counts.success > 0 ? 'Partly failed' : 'Failed' }
  if (counts.success > 0) return { tone: 'success', label: 'Published' }
  return { tone: 'draft', label: 'Draft' }
}

export function wordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
}
