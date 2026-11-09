import TeamScreen from '@/components/organisms/TeamScreen'
import { getTeamDirectory, getApprovals, getNotifications, getRecognitionTree } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'

export default function TeamPage() {
  const data = usePageData(async () => {
    const [rows, approvals, notifications, tree] = await Promise.all([
      getTeamDirectory(),
      getApprovals(),
      getNotifications(),
      getRecognitionTree(),
    ])
    const approvalsCount = notifications.filter((n) => n.unread && n.group === 'approval').length
    return { rows, approvals, approvalsCount, tree }
  })

  if (!data) return null

  return (
    <TeamScreen rows={data.rows} approvals={data.approvals} approvalsCount={data.approvalsCount} tree={data.tree} />
  )
}
