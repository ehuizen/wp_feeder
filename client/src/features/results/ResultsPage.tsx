// /posts/:id/results: where one post went, per site, with Retry for the failed ones.
import { RotateCw } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { LoadError } from '@/components/LoadError'
import { Notice } from '@/components/Notice'
import { PageHeader } from '@/components/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePost } from '@/features/posts/use-posts'
import { ResultsTable } from '@/features/results/ResultsTable'
import { useRetry } from '@/features/results/use-retry'
import { plural } from '@/lib/format'

export function ResultsPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { data: post, loading, error, reload } = usePost(id)
  const { retryingIds, message, retryOne, retryAll } = useRetry(id, reload)
  const arrivedWith = typeof location.state === 'object' && location.state && 'summary' in location.state
    ? String(location.state.summary)
    : ''

  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Loading results…</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }
  if (error || !post) return <LoadError what="these results" message={error ?? 'Not found'} onRetry={reload} />

  const failedIds = post.publications.filter((p) => p.status === 'failed').map((p) => p.siteId)
  const sent = post.publications.filter((p) => p.status === 'success').length

  return (
    <>
      <PageHeader
        title="Publish results"
        description={`${post.title} · ${sent} of ${plural(post.publications.length, 'site')} published`}
        actions={
          <>
            <Link to="/posts" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Back to posts
            </Link>
            {failedIds.length > 0 && (
              <Button size="lg" onClick={() => retryAll(failedIds)} disabled={retryingIds.length > 0}>
                <RotateCw aria-hidden="true" className={retryingIds.length > 1 ? 'animate-spin' : undefined} />
                Retry {plural(failedIds.length, 'failed site')}
              </Button>
            )}
          </>
        }
      />
      <Notice message={message || arrivedWith} tone={failedIds.length > 0 ? 'danger' : 'default'} />

      {post.publications.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          This post hasn’t been sent yet.{' '}
          <Link to={`/distribute?post=${post.id}`} className="font-medium text-editorial-accent underline underline-offset-4">
            Send it from Distribute
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <ResultsTable publications={post.publications} retryingIds={retryingIds} onRetry={retryOne} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Retrying only sends to failed sites. A post that already went out is updated, never duplicated.
          </p>
        </>
      )}
    </>
  )
}
