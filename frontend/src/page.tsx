import Hero from '@/components/organisms/Hero'
import { StatCards } from '@/components/organisms/StatCards'
import EoQShowcase from '@/components/organisms/EoQShowcase'
import Leaderboard from '@/components/organisms/Leaderboard'
import { getMe, getDashboardStats, getLeaderboard, getShowcaseSlides, getHeroMedia } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from './load-ui'

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const me = usePageData(getMe, [])
  const stats = usePageData(getDashboardStats, [])
  const leaderboard = usePageData(getLeaderboard, [])
  const slides = usePageData(getShowcaseSlides, [])
  // The hero media is best-effort: getHeroMedia resolves null when nothing
  // is published OR the backend is unreachable, so it never blocks the page.
  const heroMedia = usePageData(getHeroMedia, [])

  if (me.isLoading || stats.isLoading || leaderboard.isLoading || slides.isLoading || heroMedia.isLoading) {
    return <LoadingSkeleton />
  }
  const failure = me.error ?? stats.error ?? leaderboard.error ?? slides.error
  if (failure) return <ErrorState error={failure} />

  if (!me.data || !stats.data || !leaderboard.data || !slides.data) return null

  return (
    <div>
      <Hero name={me.data.full_name} media={heroMedia.data ?? undefined} />

      <div className="mb-3 -mx-2.5 lg:-mx-[30px]">
        <p className="text-[11px] font-extrabold font-mono uppercase tracking-[0.2em] text-brand">My activity</p>
      </div>

      <StatCards
        balance={stats.data.balance}
        given={stats.data.given}
        got={stats.data.got}
        orgRecognitions={stats.data.orgRecognitions}
      />

      <p className="mb-3 mt-6 -mx-2.5 lg:-mx-[30px] text-[11px] font-extrabold font-mono uppercase tracking-[0.2em] text-brand">
        Team highlights
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-4 -mx-2.5 lg:-mx-[30px]">
        <div className="flex flex-1 flex-col [&>*]:flex [&>*]:h-full [&>*]:min-h-0">
          <EoQShowcase slides={slides.data} />
        </div>
        <div className="flex flex-col">
          <Leaderboard rows={leaderboard.data} />
        </div>
      </div>
    </div>
  )
}
