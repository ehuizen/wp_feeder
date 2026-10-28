import { ArrowRight } from 'lucide-react'
import logoUrl from '@/assets/wpfeeder-logo.svg'
import { buttonVariants } from '@/components/ui/button'

// Shown by AuthGate when /api/me says 401. Both buttons leave the SPA:
// /login and /signup are server routes that redirect to Auth0.
export function SignInPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4">
      <div className="flex flex-col items-center gap-2">
        <img src={logoUrl} alt="WPFeeder" width={220} height={39} />
        <p className="font-serif text-[22px] leading-7 text-editorial-accent italic">
          Less room for chaos.
        </p>
      </div>

      <section className="w-full max-w-100 rounded-xl bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to write once and publish to all your WordPress sites.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <a href="/login" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
            <ArrowRight aria-hidden="true" />
            Continue to sign in
          </a>
          <a
            href="/signup"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
          >
            Create an account
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Secured by Auth0. WPFeeder never sees your password.
        </p>
      </section>
    </main>
  )
}
