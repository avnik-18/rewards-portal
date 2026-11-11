import { Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './AppShell'
import DashboardPage from './page'
import TeamPage from './team/page'
import RewardsPage from './rewards/page'
import ApprovalsPage from './approvals/page'
import ProfilePage from './profile/page'
import ComposePage from './recognize/page'
import NotFound from './not-found'
import { ErrorBoundary } from './load-ui'

/** Search-param changes refetch, so the announcer keys on pathname only. */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/team': 'My Team',
  '/rewards': 'My Rewards',
  '/approvals': 'Approvals',
  '/profile': 'Profile',
  '/recognize': 'Recognize a teammate',
}

/** Announces navigation for assistive tech — the old Next.js router did this for free. */
function RouteAnnouncer() {
  const { pathname, search } = useLocation()
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {(ROUTE_LABELS[pathname] ?? 'This page does not exist') + (pathname.includes('profile') && search ? ' of a teammate' : '')}
    </p>
  )
}

export default function App() {
  return (
    <AppShell>
      <RouteAnnouncer />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/recognize" element={<ComposePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  )
}
