import TeamScreen from '@/components/organisms/TeamScreen'
import { getTeamDirectory, getApprovals, getNotifications, getRecognitionTree } from '@/lib/data-api'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const [rows, approvals, notifications, tree] = await Promise.all([
    getTeamDirectory(),
    getApprovals(),
    getNotifications(),
    getRecognitionTree(),
  ])
  const approvalsCount = notifications.filter((n) => n.unread && n.group === 'approval').length

  return <TeamScreen rows={rows} approvals={approvals} approvalsCount={approvalsCount} tree={tree} />
}
