import TeamScreen from '@/components/organisms/TeamScreen'
import { getTeamDirectory, getApprovals, getNotifications, getRecognitionTree } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

export default function TeamPage() {
  usePageTitle('My Team')
  const { data, error, isLoading } = usePageData(async () => {
    const [rows, approvals, notifications, tree] = await Promise.all([
      getTeamDirectory(),
      getApprovals(),
      getNotifications(),
      getRecognitionTree(),
    ])
    const approvalsCount = notifications.filter((n) => n.unread && n.group === 'approval').length
    return { rows, approvals, approvalsCount, tree }
  }, [])

  if (isLoading) return <LoadingSkeleton label="Loading your team…" />
  if (error) return <ErrorState error={error} />
  if (!data) return null

  return (
    <TeamScreen rows={data.rows} approvals={data.approvals} approvalsCount={data.approvalsCount} tree={data.tree} />
  )
}
