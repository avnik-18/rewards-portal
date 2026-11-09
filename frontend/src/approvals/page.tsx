import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import { getApprovals } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'

// Decisions are session-local while data is mocked.
export default function ApprovalsPage() {
  const approvals = usePageData(getApprovals)
  if (!approvals) return null

  return <ApprovalsBoard items={approvals} />
}
