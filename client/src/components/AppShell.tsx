// Frame around signed-in pages: sidebar left, current page right.
import { Outlet } from 'react-router'
import { AppSidebar } from '@/components/AppSidebar'

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
