import { useEffect, useRef } from 'react'
import ActivityFeed from '@/components/organisms/activity-feed'
import Hero from '@/components/organisms/Hero'
import PointsBalanceCard from '@/components/organisms/points-balance-card'
import UpcomingEventsCard from '@/components/organisms/upcoming-events-card'
import Leaderboard from '@/components/organisms/Leaderboard'
import AwardsCard from '@/components/organisms/awards-card'
import { getMe, getCompanyWallet, getDashboardStats, getLeaderboard, getFeedPosts, getCelebrations, getHeroMedia } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from './load-ui'

// Non-admins never read the company wallet: the fetcher hands back undefined
// so the wallet stream stays idle while the rail still consumes .data/timers.
async function getWalletNone(): Promise<number | undefined> {
  return undefined
}

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const me = usePageData(getMe, [])
  const stats = usePageData(getDashboardStats, [])
  const leaderboard = usePageData(getLeaderboard, [])
  const posts = usePageData(getFeedPosts, [])
  const celebrations = usePageData(getCelebrations, [])
  const isWalletAdmin = me.data?.persona === 'admin'
  const wallet = usePageData(isWalletAdmin ? getCompanyWallet : getWalletNone, [isWalletAdmin])
  // hero media never rejects (getHeroMedia resolves null on outage) — a null
  // hand-off is a valid "fallback to the bundled assets" state, so only the
  // loading phase gates the page
  const hero = usePageData(getHeroMedia, [])
  const feedRef = useRef<HTMLDivElement>(null)

  /**
   * Scroll continuation (instagram-style): the WINDOW scrolls the whole page
   * first — hero, rail, award card included. Only once the page can scroll no
   * further does the wheel keep scrolling in place (this panel), which is
   * where the loader-style post flow ends. Wheel over the panel anywhere
   * while below the page end keeps native scrolling untouched.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const panel = feedRef.current
    if (!panel) return
    const onWheel = (event: WheelEvent) => {
      const doc = document.documentElement
      if (window.scrollY < doc.scrollHeight - window.innerHeight - 2) return // page still scrolling
      const canScrollIn = panel.scrollTop + panel.clientHeight < panel.scrollHeight
      if (canScrollIn || event.deltaY < 0) {
        event.preventDefault()
        panel.scrollTop += event.deltaY
      }
    }
    panel.addEventListener('wheel', onWheel, { passive: false })
    return () => panel.removeEventListener('wheel', onWheel)
  })

  if (me.isLoading || stats.isLoading || leaderboard.isLoading || posts.isLoading || celebrations.isLoading || hero.isLoading) {
    return <LoadingSkeleton />
  }
  const failure = me.error ?? stats.error ?? leaderboard.error ?? posts.error ?? celebrations.error
  if (failure) return <ErrorState error={failure} />

  if (!me.data || !stats.data || !leaderboard.data || !posts.data || !celebrations.data) return null

  const first = me.data.full_name.split(' ')[0]

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col px-4 pt-1 pb-6 lg:px-8">
      {/* The RAIL is the only in-flow column on desktop: it grows to its own
          natural height and pulls the container taller. The feed column is
          absolutely fitted into the same height. On mobile both columns simply
          stack. */}
      <div className="relative">
        <div className="flex flex-col gap-3 lg:absolute lg:inset-0 lg:right-[364px] lg:flex lg:flex-col">
          <Hero name={first} media={hero.data ?? undefined} />
          <div ref={feedRef} className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <ActivityFeed posts={posts.data} />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:ml-auto lg:w-[340px]">
          {/* Admins read the company pool instead of a personal balance —
              other personas keep the My-Rewards tile. */}
          {me.data.persona === 'admin' && wallet.data !== undefined ? (
            <PointsBalanceCard
              balance={wallet.data}
              title="Total company wallet"
              ctaTo="/manage"
              ctaLabel="Go to Manage"
            />
          ) : (
            <PointsBalanceCard balance={stats.data.balance} />
          )}
          <UpcomingEventsCard events={celebrations.data} />
          <Leaderboard rows={leaderboard.data} />
          {/* Quarterly-award nominations are a leadership + admin lane. */}
          {me.data.persona !== 'employee' && <AwardsCard />}
        </div>
      </div>
    </div>
  )
}
