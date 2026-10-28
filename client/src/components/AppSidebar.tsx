import {
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Send,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router'
import logoUrl from '@/assets/wpfeeder-logo.svg'
import { useCurrentUser } from '@/auth/current-user'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: LucideIcon }

// Collections is V2, so it's not listed here.
const workspace: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/distribute', label: 'Distribute', icon: Send },
  { to: '/posts', label: 'Posts', icon: FileText },
  { to: '/sites', label: 'Sites', icon: Globe },
]

const account: NavItem[] = [{ to: '/settings', label: 'Settings', icon: Settings }]

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <h2 className="px-3 text-xs font-medium tracking-wider text-sidebar-muted-foreground uppercase">
        {label}
      </h2>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            {/* NavLink sets aria-current="page" on the active link; "end" stops "/" matching everything. */}
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-muted',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent',
                )
              }
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function initials(name: string | null, email: string | null): string {
  const source = name ?? email ?? '?'
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function AppSidebar() {
  const user = useCurrentUser()

  return (
    <aside className="flex h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-6 pt-6 pb-8">
        <img src={logoUrl} alt="WPFeeder" width={148} height={26} />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col justify-between px-3 pb-4">
        <NavSection label="Workspace" items={workspace} />
        <NavSection label="Account" items={account} />
      </nav>

      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
        >
          {initials(user.name, user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name ?? 'Signed in'}</p>
          {user.email && <p className="truncate text-xs text-sidebar-muted-foreground">{user.email}</p>}
        </div>
        {/* /logout is a server route (Auth0), so a real link, not a router Link. */}
        <a
          href="/logout"
          aria-label="Sign out"
          className="rounded-md p-2 text-sidebar-foreground hover:bg-muted"
        >
          <LogOut aria-hidden="true" className="size-4" />
        </a>
      </div>
    </aside>
  )
}
