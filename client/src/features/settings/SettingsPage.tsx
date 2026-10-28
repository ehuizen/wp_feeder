// /settings: profile from Auth0 (read-only), sign out, and deleting the account.
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useCurrentUser } from '@/auth/current-user'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { fieldProps } from '@/lib/field-props'

const card = 'rounded-xl border bg-card p-6 shadow-sm'

export function SettingsPage() {
  const user = useCurrentUser()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <PageHeader title="Settings" description="Manage your account." />

      <section className={card} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-semibold">
          Profile
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">Your name and email come from your Auth0 login.</p>
        <div className="flex flex-col gap-4">
          <FormField id="profile-name" label="Name">
            <Input {...fieldProps('profile-name')} value={user.name ?? ''} readOnly />
          </FormField>
          <FormField id="profile-email" label="Email" hint="Managed by Auth0.">
            <Input {...fieldProps('profile-email', undefined, true)} value={user.email ?? ''} readOnly />
          </FormField>
        </div>
      </section>

      <section className={card} aria-labelledby="session-heading">
        <h2 id="session-heading" className="font-semibold">
          Session
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">You are signed in on this browser.</p>
        <a href="/logout" className={buttonVariants({ variant: 'outline' })}>
          <LogOut aria-hidden="true" />
          Sign out
        </a>
      </section>

      <section className={`${card} border-destructive/60`} aria-labelledby="danger-heading">
        <h2 id="danger-heading" className="font-semibold text-destructive">
          Danger zone
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Deleting your account removes your sites, stored credentials and post history. Posts already published stay
          on WordPress.
        </p>
        <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => setConfirming(true)}>
          Delete account
        </Button>
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete your WPFeeder account?"
        description="This removes your sites, stored Application Passwords, posts and publish history. It can’t be undone. Your Auth0 login stays, so signing in again starts an empty account."
        confirmLabel="Delete account"
        onConfirm={async () => {
          await api<void>('/me', { method: 'DELETE' })
          window.location.href = '/logout'
        }}
      />
    </div>
  )
}
