import ActivityFeed from '@/components/organisms/activity-feed'
import Hero from '@/components/organisms/Hero'
import PointsBalanceCard from '@/components/organisms/points-balance-card'
import RecommendationsCard from '@/components/organisms/recommendations-card'
import Leaderboard from '@/components/organisms/Leaderboard'
import CelebrationsToday from '@/components/organisms/celebrations-today'
import AwardsCard from '@/components/organisms/awards-card'
import { getMe, getDashboardStats, getLeaderboard, getFeedPosts, getCelebrations, getHeroMedia } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from './load-ui'

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const me = usePageData(getMe, [])
  const stats = usePageData(getDashboardStats, [])
  const leaderboard = usePageData(getLeaderboard, [])
  const posts = usePageData(getFeedPosts, [])
  const celebrations = usePageData(getCelebrations, [])
  // hero media never rejects (getHeroMedia resolves null on outage) — a null
  // hand-off is a valid "fallback to the bundled assets" state, so only the
  // loading phase gates the page
  const hero = usePageData(getHeroMedia, [])

  if (me.isLoading || stats.isLoading || leaderboard.isLoading || posts.isLoading || celebrations.isLoading || hero.isLoading) {
    return <LoadingSkeleton />
  }
  const failure = me.error ?? stats.error ?? leaderboard.error ?? posts.error ?? celebrations.error
  if (failure) return <ErrorState error={failure} />

  if (!me.data || !stats.data || !leaderboard.data || !posts.data || !celebrations.data) return null

  const first = me.data.full_name.split(' ')[0]

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-1 pb-6 lg:px-8">
      {/* The RAIL is the only in-flow column on desktop: it grows to its own
          natural height and pulls the container taller. The feed column is
          absolutely fitted into the same height, so the feed's deeper posts
          scroll INSIDE it exactly past the rail's end (awards bottom). On
          mobile both columns simply stack. */}
      <div className="relative">
        <div className="flex flex-col gap-3 lg:absolute lg:inset-0 lg:right-[364px] lg:flex lg:flex-col">
          <Hero name={first} media={hero.data ?? undefined} />
          <div className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <ActivityFeed posts={posts.data} />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:ml-auto lg:w-[340px]">
          <PointsBalanceCard balance={stats.data.balance} />
          <RecommendationsCard />
          <Leaderboard rows={leaderboard.data} />
          <CelebrationsToday items={celebrations.data} />
          <AwardsCard />
        </div>
      </div>
    </div>
  )
}
