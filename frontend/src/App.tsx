import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import DesignSystemPage from './pages/DesignSystemPage'
import InboxPage from './pages/InboxPage'
import LearningPage from './pages/LearningPage'
import LeisurePage from './pages/LeisurePage'
import LiteraturePage from './pages/LiteraturePage'
import NotFound from './pages/NotFound'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ResearchPage from './pages/ResearchPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './store/useSettingsStore'

const queryClient = new QueryClient()

export default function App() {
  const load = useSettingsStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/research/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/literature" element={<LiteraturePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/leisure" element={<LeisurePage />} />
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
