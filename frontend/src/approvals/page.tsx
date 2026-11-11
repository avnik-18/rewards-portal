import ApprovalsBoard from '@/components/organisms/ApprovalsBoard'
import { getApprovals } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

// Decisions are session-local while data is mocked.
export default function ApprovalsPage() {
  usePageTitle('Approvals')
  const { data: approvals, error, isLoading } = usePageData(getApprovals, [])

  if (isLoading) return <LoadingSkeleton label="Loading approvals…" />
  if (error) return <ErrorState error={error} />
  if (!approvals) return null

  return <ApprovalsBoard items={approvals} />
}
