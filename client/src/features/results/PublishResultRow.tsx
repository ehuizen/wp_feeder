// One site's result for a post: status in words, a link to the live post or the error, and Retry when it failed.
import { ExternalLink, RotateCw } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import type { Publication, PublicationStatus } from '@/features/posts/posts-api'
import { domainOf } from '@/lib/format'

const statusWords: Record<PublicationStatus, { tone: StatusTone; label: string }> = {
  success: { tone: 'success', label: 'Published' },
  failed: { tone: 'danger', label: 'Failed' },
  pending: { tone: 'warning', label: 'Pending' },
}

type PublishResultRowProps = {
  publication: Publication
  retrying?: boolean
  onRetry?: (siteId: string) => void
}

export function PublishResultRow({ publication, retrying = false, onRetry }: PublishResultRowProps) {
  const status = statusWords[publication.status]

  return (
    <TableRow>
      <TableCell>
        <p className="font-semibold">{publication.siteName}</p>
        <p className="text-xs text-muted-foreground">{domainOf(publication.siteBaseUrl)}</p>
      </TableCell>
      <TableCell>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </TableCell>
      <TableCell className="max-w-md whitespace-normal">
        {publication.status === 'success' && publication.url ? (
          <a
            href={publication.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-editorial-accent underline-offset-4 hover:underline"
          >
            View live post
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="sr-only">on {publication.siteName} (opens in a new tab)</span>
          </a>
        ) : publication.status === 'failed' ? (
          <span className="text-sm text-destructive">{publication.error ?? 'Failed'}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Waiting to send</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {publication.status === 'failed' && onRetry && (
          <Button variant="outline" onClick={() => onRetry(publication.siteId)} disabled={retrying}>
            <RotateCw aria-hidden="true" className={retrying ? 'animate-spin' : undefined} />
            {retrying ? 'Retrying…' : 'Retry'}
            <span className="sr-only">{publication.siteName}</span>
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
