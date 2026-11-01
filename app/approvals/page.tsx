import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import { getApprovals } from '@/lib/data-api'

// Decisions are session-local while data is mocked.
export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const approvals = await getApprovals()

  return <ApprovalsBoard items={approvals} />
}
