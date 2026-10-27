import { Outlet } from 'react-router'
import { AppSidebar } from '@/components/AppSidebar'

// The frame around every signed-in page: sidebar on the left, the current route on the right.
export function AppShell() {
  return (
    <div className="flex h-svh">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto px-10 py-10">
        <Outlet />
      </main>
    </div>
  )
}
