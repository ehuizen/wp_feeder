// /posts/new and /posts/:id/edit: write or edit a post. Saving keeps it in WPFeeder; sending is on /distribute.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FormField } from '@/components/FormField'
import { LoadError } from '@/components/LoadError'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { postStatus, wordCount } from '@/features/posts/post-status'
import { createPost, updatePost, type PostDetail } from '@/features/posts/posts-api'
import { usePost } from '@/features/posts/use-posts'
import { ApiError } from '@/lib/api'
import { fieldProps } from '@/lib/field-props'
import { plural, timeAgo } from '@/lib/format'

export function NewPostPage() {
  return <PostEditor post={null} />
}

export function EditPostPage() {
  const { id = '' } = useParams()
  const { data: post, loading, error, reload } = usePost(id)

  if (loading) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <span className="sr-only">Loading post…</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }
  if (error || !post) return <LoadError what="this post" message={error ?? 'Not found'} onRetry={reload} />
  // key: a different post id starts a fresh form.
  return <PostEditor key={post.id} post={post} />
}

function PostEditor({ post }: { post: PostDetail | null }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [savedAt, setSavedAt] = useState(post?.updatedAt ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | undefined>()

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setTitleError('Give the post a title.')
      return
    }
    setSaving(true)
    setError(null)
    setTitleError(undefined)
    try {
      if (post) {
        const updated = await updatePost(post.id, { title, excerpt, content })
        setSavedAt(updated.updatedAt)
      } else {
        const created = await createPost({ title, excerpt, content })
        navigate(`/posts/${created.id}/edit`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t save the post. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const sentTo = post?.publications.filter((p) => p.status === 'success').length ?? 0
  const status = post
    ? postStatus({
        total: post.publications.length,
        success: sentTo,
        failed: post.publications.filter((p) => p.status === 'failed').length,
        pending: 0,
      })
    : { tone: 'draft' as const, label: 'Draft' }

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={post ? 'Edit post' : 'New post'}
        description="Changes are saved in WPFeeder. Send the post from Distribute when it’s ready."
        actions={
          <>
            <Link to="/posts" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Cancel
            </Link>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? 'Saving…' : 'Save post'}
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive-subtle px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm">
          <FormField id="post-title" label="Title" error={titleError}>
            <Input {...fieldProps('post-title', titleError)} value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField id="post-excerpt" label="Excerpt" hint="Shown in post listings and link previews.">
            <Input {...fieldProps('post-excerpt', undefined, true)} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </FormField>
          <FormField id="post-content" label="Content" hint="Plain text or HTML. Blank lines become paragraphs in WordPress.">
            <Textarea
              {...fieldProps('post-content', undefined, true)}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-96 font-sans"
            />
          </FormField>
        </section>

        <aside className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Post details</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="justify-self-end">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </dd>
            <dt className="text-muted-foreground">Last saved</dt>
            <dd className="justify-self-end font-semibold">{savedAt ? timeAgo(savedAt) : 'Not saved yet'}</dd>
            <dt className="text-muted-foreground">Words</dt>
            <dd className="justify-self-end font-semibold">{wordCount(content)}</dd>
            <dt className="text-muted-foreground">Published to</dt>
            <dd className="justify-self-end font-semibold">{sentTo > 0 ? plural(sentTo, 'site') : 'No sites yet'}</dd>
          </dl>
          {post && (
            <Link to={`/distribute?post=${post.id}`} className={buttonVariants({ variant: 'outline', className: 'mt-5 w-full' })}>
              Go to Distribute
            </Link>
          )}
        </aside>
      </div>
    </form>
  )
}
