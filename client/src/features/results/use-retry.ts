// Retry for publish results: one site (publish again to just that site) or every failed site at once.
import { useState } from 'react'
import { publishPost, retryFailed, type PublishResult } from '@/features/posts/posts-api'
import { ApiError } from '@/lib/api'

export function summarise(results: PublishResult[]): string {
  const sent = results.filter((r) => r.status === 'success').length
  if (results.length === 0) return 'Nothing to retry: no sites have failed.'
  if (sent === results.length) return `Published to ${sent} of ${results.length} sites.`
  return `Published to ${sent} of ${results.length} sites. ${results.length - sent} still failed; you can retry from the results.`
}

export function useRetry(postId: string, afterRetry: () => Promise<void>) {
  const [retryingIds, setRetryingIds] = useState<string[]>([])
  const [message, setMessage] = useState('')

  async function run(siteIds: string[], send: () => Promise<{ results: PublishResult[] }>) {
    setRetryingIds(siteIds)
    try {
      const { results } = await send()
      setMessage(summarise(results))
      await afterRetry()
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Retry failed. Try again.')
    } finally {
      setRetryingIds([])
    }
  }

  return {
    retryingIds,
    message,
    retryOne: (siteId: string) => run([siteId], () => publishPost(postId, [siteId])),
    retryAll: (failedIds: string[]) => run(failedIds, () => retryFailed(postId)),
  }
}
