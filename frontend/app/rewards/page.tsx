import RewardsBalanceHero from '@/components/organisms/RewardsBalanceHero'
import RecognitionsReceived from "@/components/organisms/recognitions-received"
import ValuesYouLive from "@/components/organisms/values-you-live"
import MyEoQAwards from "@/components/organisms/eoq-awards"
import { RewardsLedger } from "@/components/organisms/rewards-ledger"
import { getRewards } from '@/lib/data-api'

export const dynamic = 'force-dynamic'

export default async function RewardsPage() {
  const { summary, received, ledger, valuesLived, eoqAwards } = await getRewards()
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy md:text-[34px]">My Rewards</h1>
        <p className="mt-1 text-[15px] text-muted">
          Your balance, what you can spend it on, and everything you have earned.
        </p>
      </div>

      <RewardsBalanceHero summary={summary} />

      <RecognitionsReceived items={received} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ValuesYouLive values={valuesLived} />
        <MyEoQAwards awards={eoqAwards} />
      </div>

      <RewardsLedger entries={ledger} />
    </div>
  )
}
