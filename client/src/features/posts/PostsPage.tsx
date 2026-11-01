// /posts: manage posts (search, edit, delete). Sending happens only on /distribute.
import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadError } from '@/components/LoadError'
import { Notice } from '@/components/Notice'
import { PageHeader } from '@/components/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PostCard } from '@/features/posts/PostCard'
import { deletePost, type PostSummary } from '@/features/posts/posts-api'
import { usePosts } from '@/features/posts/use-posts'
import { plural } from '@/lib/format'

export function PostsPage() {
  const { data: posts, loading, error, reload, setData } = usePosts()
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<PostSummary | null>(null)
  const [notice, setNotice] = useState('')

  const term = query.trim().toLowerCase()
  const visible = term ? posts.filter((p) => p.title.toLowerCase().includes(term)) : posts
  const drafts = posts.filter((p) => p.publications.total === 0).length

  const newPost = (
    <Link to="/posts/new" className={buttonVariants({ size: 'lg' })}>
      <Plus aria-hidden="true" />
      New post
    </Link>
  )

  return (
    <>
      <PageHeader title="Posts" description="Drafts live in WPFeeder until you distribute them." actions={newPost} />
      <Notice message={notice} />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          <span className="sr-only">Loading posts…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <LoadError what="your posts" message={error} onRetry={reload} />
      ) : posts.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No posts yet</EmptyTitle>
            <EmptyDescription>Write a post here, then send it to your sites from Distribute.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newPost}</EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input
              type="search"
              aria-label="Search posts"
              placeholder="Search posts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs bg-card"
            />
            <p className="text-sm text-muted-foreground">
              {plural(posts.length, 'post')} · {plural(drafts, 'draft')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((post) => (
              <PostCard key={post.id} post={post} onDelete={setDeleting} />
            ))}
          </div>
          {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No posts match “{query}”.</p>}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.title ?? 'post'}”?`}
        description="The post and its publish history are removed from WPFeeder. Copies already published stay on WordPress."
        confirmLabel="Delete post"
        onConfirm={async () => {
          if (!deleting) return
          await deletePost(deleting.id)
          setData(posts.filter((p) => p.id !== deleting.id))
          setNotice(`“${deleting.title}” was deleted.`)
        }}
      />
    </>
  )
}
