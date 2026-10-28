// The route table: which page shows for each URL.
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthGate } from '@/auth/AuthGate'
import { AppShell } from '@/components/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DistributePage } from '@/features/distribute/DistributePage'
import { EditPostPage, NewPostPage } from '@/features/posts/PostEditorPage'
import { PostsPage } from '@/features/posts/PostsPage'
import { ResultsPage } from '@/features/results/ResultsPage'
import { SitesPage } from '@/features/sites/SitesPage'
import { NotFoundPage, PlaceholderPage } from '@/pages/PlaceholderPage'

export function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="posts/new" element={<NewPostPage />} />
            <Route path="posts/:id/edit" element={<EditPostPage />} />
            <Route path="posts/:id/results" element={<ResultsPage />} />
            <Route path="distribute" element={<DistributePage />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  )
}
