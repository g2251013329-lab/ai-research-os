import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import InboxPage from './pages/InboxPage'
import LearningPage from './pages/LearningPage'
import NotFound from './pages/NotFound'
import PlaceholderPage from './pages/PlaceholderPage'
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
            <Route
              path="/research"
              element={<PlaceholderPage titleKey="nav.research" phase="Phase 4" />}
            />
            <Route
              path="/literature"
              element={<PlaceholderPage titleKey="nav.literature" phase="Phase 4-5" />}
            />
            <Route path="/inbox" element={<InboxPage />} />
            <Route
              path="/leisure"
              element={<PlaceholderPage titleKey="nav.leisure" phase="Phase 5" />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
