// /sites: list, add, verify, reconnect and remove the WordPress sites WPFeeder can publish to.
import { Globe, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadError } from '@/components/LoadError'
import { Notice } from '@/components/Notice'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SiteDialog, type SiteDialogMode } from '@/features/sites/SiteDialog'
import { SiteRow } from '@/features/sites/SiteRow'
import { removeSite, type Site } from '@/features/sites/sites-api'
import { needsAttention, useSites } from '@/features/sites/use-sites'
import { plural } from '@/lib/format'

export function SitesPage() {
  const { data: sites, loading, error, reload, setData } = useSites()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialog, setDialog] = useState<SiteDialogMode | null>(
    searchParams.get('add') === '1' ? { kind: 'add' } : null,
  )
  const [removing, setRemoving] = useState<Site | null>(null)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  function closeDialog() {
    setDialog(null)
    if (searchParams.has('add')) setSearchParams({}, { replace: true })
  }

  function upsert(site: Site) {
    setData(sites.some((s) => s.id === site.id) ? sites.map((s) => (s.id === site.id ? site : s)) : [...sites, site])
  }

  const term = query.trim().toLowerCase()
  const visible = term
    ? sites.filter((s) => s.name.toLowerCase().includes(term) || s.baseUrl.toLowerCase().includes(term))
    : sites
  const attention = needsAttention(sites).length

  return (
    <>
      <PageHeader
        title="Sites"
        description="WordPress sites WPFeeder can publish to. Credentials are encrypted and never shown again."
        actions={
          <Button size="lg" onClick={() => setDialog({ kind: 'add' })}>
            <Plus aria-hidden="true" />
            Add site
          </Button>
        }
      />

      <Notice message={notice} />

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="sr-only">Loading sites…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : error ? (
        <LoadError what="your sites" message={error} onRetry={reload} />
      ) : sites.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No sites connected yet</EmptyTitle>
            <EmptyDescription>
              Connect a WordPress site with an Application Password to start publishing.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setDialog({ kind: 'add' })}>
              <Plus aria-hidden="true" />
              Connect a site
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input
              type="search"
              aria-label="Search sites"
              placeholder="Search sites…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs bg-card"
            />
            <p className="text-sm text-muted-foreground">
              {plural(sites.length, 'site')}
              {attention > 0 && ` · ${attention} need${attention === 1 ? 's' : ''} attention`}
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="text-xs uppercase">Site</TableHead>
                  <TableHead className="text-xs uppercase">Status</TableHead>
                  <TableHead className="text-xs uppercase">Last verified</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((site) => (
                  <SiteRow
                    key={site.id}
                    site={site}
                    onChanged={upsert}
                    onEdit={(s) => setDialog({ kind: 'edit', site: s })}
                    onRemove={setRemoving}
                    onNotice={setNotice}
                  />
                ))}
              </TableBody>
            </Table>
            {visible.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No sites match “{query}”.</p>
            )}
          </div>
        </>
      )}

      <SiteDialog
        mode={dialog}
        onClose={closeDialog}
        onSaved={(site) => {
          upsert(site)
          setNotice(`${site.name} is connected.`)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? 'site'}?`}
        description="WPFeeder forgets this site and its stored password. Posts already published there stay on WordPress."
        confirmLabel="Remove site"
        onConfirm={async () => {
          if (!removing) return
          await removeSite(removing.id)
          setData(sites.filter((s) => s.id !== removing.id))
          setNotice(`${removing.name} was removed.`)
        }}
      />
    </>
  )
}
