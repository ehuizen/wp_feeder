// One post on the Posts page: status, title, excerpt, where it went, and Edit. No sending from here.
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { postStatus } from '@/features/posts/post-status'
import type { PostSummary } from '@/features/posts/posts-api'
import { formatDate, plural } from '@/lib/format'

export function PostCard({ post, onDelete }: { post: PostSummary; onDelete: (post: PostSummary) => void }) {
  const status = postStatus(post.publications)
  const sent = post.publications.success

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${post.title}`} />}>
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(post)}>
              <Trash2 aria-hidden="true" />
              Delete post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h2 className="text-lg leading-snug font-semibold">{post.title}</h2>
      {post.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
      <div className="mt-auto flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {sent > 0 && post.lastPublishedAt
            ? `On ${plural(sent, 'site')} · ${formatDate(post.lastPublishedAt)}`
            : `Updated ${formatDate(post.updatedAt)}`}
        </p>
        <Link
          to={`/posts/${post.id}/edit`}
          className={buttonVariants({ variant: 'ghost' })}
          aria-label={`Edit ${post.title}`}
        >
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      </div>
    </article>
  )
}
