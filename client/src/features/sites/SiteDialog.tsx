// Add a site, or edit/reconnect one. WordPress checks the login before anything is saved.
import { useState, type FormEvent } from 'react'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createSite, updateSite, type Site, type SiteChanges } from '@/features/sites/sites-api'
import { ApiError } from '@/lib/api'
import { fieldProps } from '@/lib/field-props'

export type SiteDialogMode = { kind: 'add' } | { kind: 'edit'; site: Site }

type Field = 'name' | 'baseUrl' | 'wpUsername' | 'appPassword'
type Errors = Partial<Record<Field | 'form', string>>

type SiteDialogProps = {
  mode: SiteDialogMode | null
  onClose: () => void
  onSaved: (site: Site) => void
}

function errorsFrom(err: unknown): Errors {
  if (!(err instanceof ApiError)) return { form: 'Something went wrong. Try again.' }
  switch (err.code) {
    case 'validation_error': {
      const errors: Errors = {}
      for (const field of ['name', 'baseUrl', 'wpUsername', 'appPassword'] as const) {
        if (err.fields[field]?.length) errors[field] = fieldMessage(field)
      }
      return Object.keys(errors).length ? errors : { form: err.message }
    }
    case 'site_exists':
      return { baseUrl: 'You’ve already connected this site.' }
    case 'wordpress_rejected':
      return { appPassword: 'WordPress rejected this username or Application Password (401). Check it and try again.' }
    default:
      return { form: err.message }
  }
}

function fieldMessage(field: Field): string {
  switch (field) {
    case 'name':
      return 'Give the site a name.'
    case 'baseUrl':
      return 'Enter the full https:// address of the site.'
    case 'wpUsername':
      return 'Enter the WordPress username.'
    case 'appPassword':
      return 'Enter the Application Password.'
  }
}

export function SiteDialog({ mode, onClose, onSaved }: SiteDialogProps) {
  const [saving, setSaving] = useState(false)
  const editing = mode?.kind === 'edit' ? mode.site : null

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* The dialog unmounts its content when closed, so every open starts with a fresh form. */}
        <SiteForm editing={editing} saving={saving} setSaving={setSaving} onClose={onClose} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  )
}

type SiteFormProps = {
  editing: Site | null
  saving: boolean
  setSaving: (saving: boolean) => void
  onClose: () => void
  onSaved: (site: Site) => void
}

function SiteForm({ editing, saving, setSaving, onClose, onSaved }: SiteFormProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [baseUrl, setBaseUrl] = useState('')
  const [wpUsername, setWpUsername] = useState(editing?.wpUsername ?? '')
  const [appPassword, setAppPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      let site: Site
      if (editing) {
        const changes: SiteChanges = {}
        if (name.trim() !== editing.name) changes.name = name
        if (wpUsername.trim() !== editing.wpUsername) changes.wpUsername = wpUsername
        if (appPassword) changes.appPassword = appPassword
        site = Object.keys(changes).length ? await updateSite(editing.id, changes) : editing
      } else {
        site = await createSite({ name, baseUrl: baseUrl.trim(), wpUsername, appPassword })
      }
      onSaved(site)
      onClose()
    } catch (err) {
      setErrors(errorsFrom(err))
    } finally {
      setSaving(false)
    }
  }

  const reconnecting = editing?.status === 'failing'

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>
          {editing ? (reconnecting ? `Reconnect ${editing.name}` : `Edit ${editing.name}`) : 'Connect a WordPress site'}
        </DialogTitle>
        <DialogDescription>
          We check the credentials with WordPress before anything is saved.
        </DialogDescription>
      </DialogHeader>

      <FormField id="site-name" label="Site name" error={errors.name}>
        <Input
          {...fieldProps('site-name', errors.name)}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Legal"
          autoComplete="off"
        />
      </FormField>

      {editing ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Site URL</span>
          <span className="text-sm text-muted-foreground">{editing.baseUrl}</span>
        </div>
      ) : (
        <FormField id="site-url" label="Site URL" error={errors.baseUrl}>
          <Input
            {...fieldProps('site-url', errors.baseUrl)}
            type="url"
            inputMode="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://acmelegal.example"
          />
        </FormField>
      )}

      <FormField id="site-username" label="WordPress username" error={errors.wpUsername}>
        <Input
          {...fieldProps('site-username', errors.wpUsername)}
          value={wpUsername}
          onChange={(e) => setWpUsername(e.target.value)}
          autoComplete="off"
        />
      </FormField>

      <FormField
        id="site-password"
        label="Application password"
        error={errors.appPassword}
        hint={
          editing
            ? 'Leave blank to keep the current password.'
            : 'Create one in WordPress under Users › Profile › Application Passwords.'
        }
      >
        <Input
          {...fieldProps('site-password', errors.appPassword, true)}
          type="password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
          placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
          autoComplete="new-password"
        />
      </FormField>

      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Checking with WordPress…' : editing ? 'Verify & save' : 'Verify & connect'}
        </Button>
          </DialogFooter>
    </form>
  )
}
