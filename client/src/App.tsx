// The route table: which page shows for each URL.
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthGate } from '@/auth/AuthGate'
import { AppShell } from '@/components/AppShell'
import { SitesPage } from '@/features/sites/SitesPage'
import { NotFoundPage, PlaceholderPage } from '@/pages/PlaceholderPage'

export function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<PlaceholderPage title="Dashboard" />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="posts" element={<PlaceholderPage title="Posts" />} />
            <Route path="posts/new" element={<PlaceholderPage title="New post" />} />
            <Route path="posts/:id/edit" element={<PlaceholderPage title="Edit post" />} />
            <Route path="posts/:id/results" element={<PlaceholderPage title="Publish results" />} />
            <Route path="distribute" element={<PlaceholderPage title="Distribute" />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  )
}
