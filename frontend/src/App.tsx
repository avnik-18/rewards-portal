import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './login/page'
import AppShell from './AppShell'
import DashboardPage from './page'
import TeamPage from './team/page'
import RewardsPage from './rewards/page'
import ApprovalsPage from './approvals/page'
import ProfilePage from './profile/page'
import ComposePage from './recognize/page'
import NotFound from './not-found'
import { ErrorBoundary } from './load-ui'
import { selectedDemoUser } from '@/lib/demo-auth'

/** Search-param changes refetch, so the announcer keys on pathname only. */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/team': 'My Team',
  '/rewards': 'My Rewards',
  '/approvals': 'Approvals',
  '/profile': 'Profile',
  '/recognize': 'Recognize a teammate',
  '/login': 'Sign in',
}

/** Announces navigation for assistive tech — the old Next.js router did this for free. */
function RouteAnnouncer() {
  const { pathname, search } = useLocation()
  return (
    <p aria-live="polite" className="sr-only">
      {(ROUTE_LABELS[pathname] ?? 'This page does not exist') +
        (pathname.includes('profile') && search ? ' of a teammate' : '')}
    </p>
  )
}

/** Portal routes sign in first: no picked demo identity → the login screen.
 *  (Entra SSO replaces this local-only gate when the rollout lands.) */
function RequireDemoUser({ children }: { children: ReactNode }) {
  if (selectedDemoUser() === null) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <RouteAnnouncer />
      <Routes>
        {/* Full-viewport split screen — the login page is bare of shell chrome */}
        <Route path="/login" element={<LoginPage />} />
        {/*
          Everything else sits behind the sign-in gate, inside the shell.
          Outlet lets ErrorBoundary catch whichever page the matched route renders.
        */}
        <Route
          element={
            <RequireDemoUser>
              <AppShell>
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </AppShell>
            </RequireDemoUser>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/recognize" element={<ComposePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
