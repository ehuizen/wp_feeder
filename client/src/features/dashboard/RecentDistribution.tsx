// Dashboard card: the most recently sent post and its per-site results, with Retry.
import { Link } from 'react-router'
import { Notice } from '@/components/Notice'
import { Skeleton } from '@/components/ui/skeleton'
import { usePost } from '@/features/posts/use-posts'
import { ResultsTable } from '@/features/results/ResultsTable'
import { useRetry } from '@/features/results/use-retry'
import { timeAgo } from '@/lib/format'

export function RecentDistribution({ postId }: { postId: string }) {
  const { data: post, loading, error, reload } = usePost(postId)
  const { retryingIds, message, retryOne } = useRetry(postId, reload)

  if (loading) return <Skeleton className="mt-6 h-48 rounded-xl" />
  if (error || !post) return null

  const lastAttempt = post.publications
    .map((p) => p.attemptedAt)
    .filter((at): at is string => at !== null)
    .sort()
    .at(-1)

  return (
    <section aria-labelledby="recent-heading" className="mt-6 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 p-5">
        <div>
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recent distribution
          </h2>
          <p className="text-sm text-muted-foreground">
            {post.title}
            {lastAttempt && ` · sent ${timeAgo(lastAttempt)}`}
          </p>
        </div>
        <Link to={`/posts/${post.id}/results`} className="text-sm font-medium text-editorial-accent underline-offset-4 hover:underline">
          View all results
        </Link>
      </div>
      <div className="px-5">
        <Notice message={message} />
      </div>
      <ResultsTable publications={post.publications} retryingIds={retryingIds} onRetry={retryOne} />
    </section>
  )
}
