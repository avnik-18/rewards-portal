import { Link } from 'react-router-dom'
import ActivityFeed from '@/components/organisms/activity-feed'
import { fmtNum } from '@/lib/format'
import PointsBalanceCard from '@/components/organisms/points-balance-card'
import Leaderboard from '@/components/organisms/Leaderboard'
import CelebrationsToday from '@/components/organisms/celebrations-today'
import AwardsCard from '@/components/organisms/awards-card'
import { getMe, getDashboardStats, getLeaderboard, getFeedPosts, getCelebrations } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from './load-ui'

/** Time-of-day greeting above the headline ("Good morning" / afternoon / evening). */
function greeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const me = usePageData(getMe, [])
  const stats = usePageData(getDashboardStats, [])
  const leaderboard = usePageData(getLeaderboard, [])
  const posts = usePageData(getFeedPosts, [])
  const celebrations = usePageData(getCelebrations, [])

  if (me.isLoading || stats.isLoading || leaderboard.isLoading || posts.isLoading || celebrations.isLoading) {
    return <LoadingSkeleton />
  }
  const failure = me.error ?? stats.error ?? leaderboard.error ?? posts.error ?? celebrations.error
  if (failure) return <ErrorState error={failure} />

  if (!me.data || !stats.data || !leaderboard.data || !posts.data || !celebrations.data) return null

  const first = me.data.full_name.split(' ')[0]

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#0f7f7f] uppercase">{greeting(new Date())}</p>
          <h1 className="mt-1.5 text-[28px] font-bold leading-[1.2] text-[#0b2a4a]">
            Hello {first}, celebrate the progress.
          </h1>
        </div>
        <Link
          to="/recognize"
          className="flex h-11 items-center justify-center rounded-xl bg-[#f5b324] px-5 text-sm font-bold text-[#2a1c00] transition hover:brightness-105"
        >
          Recognize a teammate
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e3ebf2] bg-white max-md:grid-cols-1">
            {[
              {
                n: stats.data.orgRecognitions,
                m: 'Total recognitions at EMIDS',
                bg: 'bg-brand-soft',
                ink: 'text-brand-deep',
              },
              { n: stats.data.given, m: 'Recognitions given', bg: '', ink: 'text-[#0b2a4a]' },
              { n: stats.data.got, m: 'Recognitions received', bg: '', ink: 'text-brand' },
            ].map((cell, index) => (
              <div
                key={cell.m}
                className={`tnum px-5 py-4 max-md:border-t max-md:border-[#e3ebf2] ${cell.bg} ${
                  index > 0 ? 'border-l border-[#e3ebf2]' : ''
                }`}
              >
                <p className={`text-[26px] font-extrabold leading-[1.1] ${cell.ink}`}>{fmtNum(cell.n)}</p>
                <p className="text-[13px] text-[#55697d]">{cell.m}</p>
              </div>
            ))}
          </div>

          <ActivityFeed posts={posts.data} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PointsBalanceCard balance={stats.data.balance} />
          <Leaderboard rows={leaderboard.data} />
          <CelebrationsToday items={celebrations.data} />
          <AwardsCard />
        </div>
      </div>
    </div>
  )
}
