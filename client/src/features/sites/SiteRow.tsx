// One site in the Sites table: name, status in words, last check, and its actions.
import { Ellipsis, Globe, Pencil, RotateCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { verifySite, type Site } from '@/features/sites/sites-api'
import { ApiError } from '@/lib/api'
import { domainOf, timeAgo } from '@/lib/format'

type SiteRowProps = {
  site: Site
  onChanged: (site: Site) => void
  onEdit: (site: Site) => void
  onRemove: (site: Site) => void
  onNotice: (message: string) => void
}

export function SiteRow({ site, onChanged, onEdit, onRemove, onNotice }: SiteRowProps) {
  const [verifying, setVerifying] = useState(false)
  const failing = site.status === 'failing'

  async function verify() {
    setVerifying(true)
    try {
      const updated = await verifySite(site.id)
      onChanged(updated)
      onNotice(
        updated.status === 'ok'
          ? `${site.name} is connected.`
          : `WordPress rejected the login for ${site.name}. Reconnect it with a new Application Password.`,
      )
    } catch (err) {
      onNotice(err instanceof ApiError ? `${site.name}: ${err.message}` : `Couldn’t check ${site.name}.`)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Globe aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{site.name}</p>
            <p className="truncate text-xs text-muted-foreground">{domainOf(site.baseUrl)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge tone={failing ? 'danger' : 'success'}>{failing ? 'Auth failed' : 'Connected'}</StatusBadge>
      </TableCell>
      <TableCell className={failing ? 'text-destructive' : 'text-muted-foreground'}>
        {site.lastVerifiedAt
          ? `${failing ? 'Failed' : 'Verified'} ${timeAgo(site.lastVerifiedAt)}`
          : 'Not checked yet'}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          {failing ? (
            <Button variant="outline" onClick={() => onEdit(site)}>
              <RotateCw aria-hidden="true" />
              Reconnect
            </Button>
          ) : (
            <Button variant="ghost" onClick={verify} disabled={verifying}>
              <RotateCw aria-hidden="true" className={verifying ? 'animate-spin' : undefined} />
              {verifying ? 'Checking…' : 'Verify'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label={`More actions for ${site.name}`} />}
            >
              <Ellipsis aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(site)}>
                <Pencil aria-hidden="true" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onRemove(site)}>
                <Trash2 aria-hidden="true" />
                Remove site
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}
