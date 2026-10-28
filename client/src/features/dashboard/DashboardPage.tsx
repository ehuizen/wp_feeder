// /: first-run guide when there are no sites; otherwise stats, sites needing attention and the latest send.
import { AlertTriangle, Globe, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '@/auth/current-user'
import { LoadError } from '@/components/LoadError'
import { PageHeader } from '@/components/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RecentDistribution } from '@/features/dashboard/RecentDistribution'
import { usePosts } from '@/features/posts/use-posts'
import { needsAttention, useSites } from '@/features/sites/use-sites'
import { plural } from '@/lib/format'

const WEEK_MS = 7 * 24 * 3600 * 1000

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

const steps = [
  { title: 'Connect a site', text: 'Add a WordPress URL and an Application Password. We check it works before saving.' },
  { title: 'Write a post', text: 'Draft your article in WPFeeder. Nothing reaches WordPress yet.' },
  { title: 'Distribute', text: 'Pick your sites and publish. You get a result for every site.' },
]

function FirstRun({ firstName }: { firstName: string }) {
  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description="Connect your first WordPress site to start publishing." />
      <div className="mx-auto mb-10 flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Globe aria-hidden="true" className="size-5" />
        </span>
        <h2 className="font-semibold">No sites connected yet</h2>
        <p className="text-sm text-muted-foreground">
          Connect a WordPress site with an Application Password to start publishing.
        </p>
        <Link to="/sites?add=1" className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Connect a site
        </Link>
      </div>
      <h2 className="mb-4 text-lg font-semibold">How WPFeeder works</h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="rounded-xl border bg-card p-5 shadow-sm">
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold">
              {i + 1}
            </span>
            <h3 className="mt-3 font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </>
  )
}

export function DashboardPage() {
  const user = useCurrentUser()
  const sites = useSites()
  const posts = usePosts()
  // Captured once per visit; reading the clock during render would make renders differ.
  const [weekAgo] = useState(() => Date.now() - WEEK_MS)

  if (sites.loading || posts.loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Loading your dashboard…</span>
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
  if (sites.error) return <LoadError what="your sites" message={sites.error} onRetry={sites.reload} />
  if (posts.error) return <LoadError what="your posts" message={posts.error} onRetry={posts.reload} />

  const firstName = (user.name ?? user.email ?? 'there').split(/[\s@]/)[0] ?? 'there'
  if (sites.data.length === 0) return <FirstRun firstName={firstName} />

  const failing = needsAttention(sites.data)
  const drafts = posts.data.filter((p) => p.publications.total === 0).length
  const publishedThisWeek = posts.data.filter(
    (p) => p.lastPublishedAt && new Date(p.lastPublishedAt).getTime() > weekAgo,
  ).length
  const latest = posts.data
    .filter((p) => p.lastAttemptedAt)
    .sort((a, b) => (b.lastAttemptedAt ?? '').localeCompare(a.lastAttemptedAt ?? ''))[0]

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your sites, posts and latest publishes at a glance."
        actions={
          <>
            <Link to="/posts/new" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              <Plus aria-hidden="true" />
              New post
            </Link>
            <Link to="/distribute" className={buttonVariants({ size: 'lg' })}>
              <Send aria-hidden="true" />
              Distribute
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Connected sites"
          value={sites.data.length}
          detail={failing.length > 0 ? `${failing.length} need${failing.length === 1 ? 's' : ''} attention` : 'All connected'}
        />
        <StatCard label="Posts" value={posts.data.length} detail={plural(drafts, 'draft')} />
        <StatCard label="Published this week" value={publishedThisWeek} detail="posts sent in the last 7 days" />
      </div>

      {failing.length > 0 && (
        <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-destructive/40 bg-destructive-subtle p-4 text-destructive">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{plural(failing.length, 'site')} can’t be reached</p>
            <p>
              {failing.map((s) => s.name).join(' and ')} rejected {failing.length === 1 ? 'its' : 'their'} Application
              Password. Reconnect {failing.length === 1 ? 'it' : 'them'} in{' '}
              <Link to="/sites" className="font-semibold underline underline-offset-4">
                Sites
              </Link>{' '}
              to keep publishing.
            </p>
          </div>
        </div>
      )}

      {latest && <RecentDistribution key={latest.id} postId={latest.id} />}
    </>
  )
}
