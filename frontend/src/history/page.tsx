import { Navigate } from 'react-router-dom'
import RecognitionsReceived from '@/components/organisms/recognitions-received'
import { RewardsLedger } from '@/components/organisms/rewards-ledger'
import { getMe, getRewards } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

/** Recognition history — what an employee (or a leader) has been given and
 *  the point trail behind it. Admins run the portal, not their own history,
 *  so their navbar never offers this tab. */
export default function RecognitionHistoryPage() {
  usePageTitle('Recognition history')
  const me = usePageData(getMe, [])
  const rewards = usePageData(getRewards, [])

  if (me.isLoading || rewards.isLoading) return <LoadingSkeleton label="Loading your history…" />
  if (me.error) return <ErrorState error={me.error} />
  if (rewards.error) return <ErrorState error={rewards.error} />

  if (me.data && me.data.persona === 'admin') return <Navigate to="/" replace />
  if (!rewards.data || !me.data) return null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-[34px]">Recognition history</h1>
        <p className="mt-1 text-[15px] text-muted">
          Every recognition you have received and the points behind it.
        </p>
      </div>

      <RecognitionsReceived items={rewards.data.received} />
      <RewardsLedger entries={rewards.data.ledger} />
    </div>
  )
}
