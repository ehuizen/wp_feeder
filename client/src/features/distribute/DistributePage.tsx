// /distribute: the only screen that sends. Choose one post, choose sites, publish, then see the results.
import { AlertTriangle, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { LoadError } from '@/components/LoadError'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { postStatus } from '@/features/posts/post-status'
import { publishPost } from '@/features/posts/posts-api'
import { usePosts } from '@/features/posts/use-posts'
import { summarise } from '@/features/results/use-retry'
import { useSites } from '@/features/sites/use-sites'
import { ApiError } from '@/lib/api'
import { domainOf, formatDate, plural } from '@/lib/format'
import { cn } from '@/lib/utils'

const card = 'rounded-xl border bg-card p-5 shadow-sm'
const option = 'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted'
const selected = 'border-primary bg-secondary hover:bg-secondary'

export function DistributePage() {
  const posts = usePosts()
  const sites = useSites()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [postId, setPostId] = useState<string | null>(searchParams.get('post'))
  const [siteIds, setSiteIds] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (posts.loading || sites.loading) {
    return (
      <div aria-busy="true" className="grid gap-4 lg:grid-cols-3">
        <span className="sr-only">Loading posts and sites…</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    )
  }
  if (posts.error) return <LoadError what="your posts" message={posts.error} onRetry={posts.reload} />
  if (sites.error) return <LoadError what="your sites" message={sites.error} onRetry={sites.reload} />

  const connected = sites.data.filter((s) => s.status === 'ok')
  const unavailable = sites.data.filter((s) => s.status === 'failing')
  const post = posts.data.find((p) => p.id === postId) ?? null
  const chosen = siteIds.filter((id) => connected.some((s) => s.id === id))
  const allChosen = connected.length > 0 && chosen.length === connected.length

  function toggleSite(id: string, checked: boolean) {
    setSiteIds((current) => (checked ? [...current, id] : current.filter((s) => s !== id)))
  }

  async function send() {
    if (!post || chosen.length === 0) return
    setSending(true)
    setError(null)
    try {
      const { results } = await publishPost(post.id, chosen)
      navigate(`/posts/${post.id}/results`, { state: { summary: summarise(results) } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t publish. Try again.')
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader title="Distribute" description="Choose a post, then the sites to publish it to." />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1fr_18rem]">
        <section className={card} aria-labelledby="choose-post">
          <h2 id="choose-post" className="font-semibold">
            1 · Choose a post
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{post ? '1 selected' : 'Pick one post to send.'}</p>
          {posts.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts yet.{' '}
              <Link to="/posts/new" className="font-medium text-editorial-accent underline underline-offset-4">
                Write one first
              </Link>
              .
            </p>
          ) : (
            <RadioGroup value={postId ?? ''} onValueChange={(value) => setPostId(String(value))} aria-labelledby="choose-post">
              {posts.data.map((p) => {
                const status = postStatus(p.publications)
                return (
                  <label key={p.id} className={cn(option, p.id === postId && selected)}>
                    <RadioGroupItem value={p.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{p.title}</span>
                      <span className="block text-xs text-muted-foreground">Updated {formatDate(p.updatedAt)}</span>
                    </span>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </label>
                )
              })}
            </RadioGroup>
          )}
        </section>

        <section className={card} aria-labelledby="choose-sites">
          <h2 id="choose-sites" className="font-semibold">
            2 · Choose sites
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Only connected sites can be selected.</p>
          {sites.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sites yet.{' '}
              <Link to="/sites?add=1" className="font-medium text-editorial-accent underline underline-offset-4">
                Connect a site
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {connected.length > 0 && (
                <label className="mb-1 flex cursor-pointer items-center gap-3 px-1 text-sm font-semibold">
                  <Checkbox
                    checked={allChosen}
                    onCheckedChange={(checked) => setSiteIds(checked ? connected.map((s) => s.id) : [])}
                  />
                  All connected sites ({connected.length})
                </label>
              )}
              {connected.map((site) => {
                const isChosen = chosen.includes(site.id)
                return (
                  <label key={site.id} className={cn(option, isChosen && selected)}>
                    <Checkbox checked={isChosen} onCheckedChange={(checked) => toggleSite(site.id, checked)} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{site.name}</span>
                      <span className="block text-xs text-muted-foreground">{domainOf(site.baseUrl)}</span>
                    </span>
                  </label>
                )
              })}
              {unavailable.length > 0 && (
                <div className="flex gap-3 rounded-lg border p-3 text-sm">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div>
                    <p className="font-semibold">{plural(unavailable.length, 'site')} unavailable</p>
                    <p className="text-muted-foreground">
                      Reconnect {unavailable.map((s) => s.name).join(' and ')} in{' '}
                      <Link to="/sites" className="font-medium text-editorial-accent underline underline-offset-4">
                        Sites
                      </Link>{' '}
                      to include {unavailable.length === 1 ? 'it' : 'them'}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className={card} aria-labelledby="summary">
          <h2 id="summary" className="mb-4 font-semibold">
            Summary
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Post</dt>
            <dd className="justify-self-end text-right font-semibold">{post?.title ?? 'None yet'}</dd>
            <dt className="text-muted-foreground">Sites</dt>
            <dd className="justify-self-end font-semibold">{chosen.length}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Sites that already have this post get it updated, not duplicated. You get a result for every site.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="mt-4 w-full" onClick={send} disabled={!post || chosen.length === 0 || sending}>
            <Send aria-hidden="true" />
            {sending ? `Publishing to ${plural(chosen.length, 'site')}…` : `Publish to ${plural(chosen.length, 'site')}`}
          </Button>
          {!post && posts.data.length > 0 && (
            <Link to="/posts" className={buttonVariants({ variant: 'link', className: 'mt-2 w-full' })}>
              Manage posts
            </Link>
          )}
        </aside>
      </div>
    </>
  )
}
