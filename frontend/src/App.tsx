import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import LoginPage from './login/page'
import AppShell from './AppShell'
import DashboardPage from './page'
import TeamPage from './team/page'
import UnderDevelopmentPage from './under-development/page'
import ApprovalsPage from './approvals/page'
import ProfilePage from './profile/page'
import ComposePage from './recognize/page'
import ManagePage from './manage/page'
import AwardsCyclePage from './awards-cycle/page'
import UpcomingEventsPage from './upcoming-events/page'
import NominationsPage from './nominations/page'
import NominationCompose from './nominations/compose'
import NominationDetailPage from './nominations/detail'
import NotFound from './not-found'
import { ErrorBoundary } from './load-ui'
import NotProvisionedPage, { type NotProvisionedIdentity } from './not-provisioned/page'
import { selectedDemoUser, selectDemoUser } from '@/lib/demo-auth'

/** Search-param changes refetch, so the announcer keys on pathname only. */
const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/team': 'My Team',
  '/rewards': 'My Rewards',
  '/manage': 'Manage',
  '/awards-cycle': 'Award cycle',
  '/recognition-history': 'Recognition history',
  '/upcoming-events': 'Upcoming events',
  '/approvals': 'Approvals',
  '/nominations': 'Award nominations',
  '/nominations/new': 'Nominate for an award',
  '/profile': 'Profile',
  '/recognize': 'Recognize a teammate',
  '/login': 'Sign in',
}

/** Announces navigation for assistive tech — the old Next.js router did this for free. */
function RouteAnnouncer() {
  const { pathname, search } = useLocation()
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {(ROUTE_LABELS[pathname] ?? 'This page does not exist') +
        (pathname.includes('profile') && search ? ' of a teammate' : '')}
    </p>
  )
}

/** Portal routes sign in first — ORDER MATTERS: an Entra SSO session (the
 *  callback lands on '/' with the session cookie) always wins, so a stale
 *  picked demo identity in localStorage can't shadow the real sign-in.
 *  /api/me maps the Entra oid to the portal users.external_id row and the
 *  visitor signs in AS that person; only with no session at all does the
 *  picked demo identity apply, and with neither → the login screen. */
function RequireIdentity({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<'checking' | 'ready' | 'blocked' | 'login'>('checking')
  const [blockedIdentity, setBlockedIdentity] = useState<NotProvisionedIdentity | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/me')
        if (res.ok) {
          const data = await res.json()
          if (data.signed_in && data.employee_code) {
            selectDemoUser(data.employee_code)
            if (!cancelled) setStage('ready')
            return
          }
          // signed in, but their Entra id maps to no users row (option A:
          // fail-closed) → show the provisioning screen, never a persona
          if (data.signed_in) {
            setBlockedIdentity({
              external_id: (data.claims?.oid as string | undefined) ?? null,
              tenant_id: (data.claims?.tid as string | undefined) ?? null,
              email: data.graph_profile?.mail ?? data.user.email,
              upn: data.user.upn,
              full_name: data.user.name,
              job_title: data.graph_profile?.jobTitle ?? data.user.job_title,
            })
            if (!cancelled) setStage('blocked')
            return
          }
        }
      } catch {
        // SSO backend unreachable (plain local dev without it) → demo gate
      }
      if (selectedDemoUser() !== null) {
        if (!cancelled) setStage('ready')
        return
      }
      if (!cancelled) setStage('login')
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  if (stage === 'ready') return <>{children}</>
  if (stage === 'blocked' && blockedIdentity) return <NotProvisionedPage identity={blockedIdentity} />
  if (stage === 'login') return <Navigate to="/login" replace />
  return (
    <p className="grid min-h-dvh place-items-center text-[14px] font-semibold text-[#5a6a83]" role="status">
      Signing you in…
    </p>
  )
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
            <RequireIdentity>
              <AppShell>
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </AppShell>
            </RequireIdentity>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route
            path="/rewards"
            element={<UnderDevelopmentPage title="My Rewards" what="The personal rewards wallet and its earned breakdown" />}
          />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/awards-cycle" element={<AwardsCyclePage />} />
          <Route
            path="/recognition-history"
            element={
              <UnderDevelopmentPage title="Recognition history" what="The full history of recognitions you gave and received" />
            }
          />
          <Route path="/upcoming-events" element={<UpcomingEventsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/nominations" element={<NominationsPage />} />
          <Route path="/nominations/new" element={<NominationCompose />} />
          <Route path="/nominations/:id" element={<NominationDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/recognize" element={<ComposePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
