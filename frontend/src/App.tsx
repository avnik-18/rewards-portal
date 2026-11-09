import { Link, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import DashboardPage from './page'
import TeamPage from './team/page'
import RewardsPage from './rewards/page'
import ApprovalsPage from './approvals/page'
import ProfilePage from './profile/page'
import ComposePage from './recognize/page'

function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy">This page doesn't exist</h1>
      <p className="mt-1 text-[15px] text-muted">Check the link, or go back to the dashboard.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
        Go to dashboard
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/recognize" element={<ComposePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  )
}
