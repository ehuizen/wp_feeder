// The table of per-site results for one post, shared by the Results page and the Dashboard.
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Publication } from '@/features/posts/posts-api'
import { PublishResultRow } from '@/features/results/PublishResultRow'

type ResultsTableProps = {
  publications: Publication[]
  retryingIds: string[]
  onRetry: (siteId: string) => void
}

export function ResultsTable({ publications, retryingIds, onRetry }: ResultsTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="text-xs uppercase">Site</TableHead>
          <TableHead className="text-xs uppercase">Status</TableHead>
          <TableHead className="text-xs uppercase">Detail</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {publications.map((publication) => (
          <PublishResultRow
            key={publication.siteId}
            publication={publication}
            retrying={retryingIds.includes(publication.siteId)}
            onRetry={onRetry}
          />
        ))}
      </TableBody>
    </Table>
  )
}
