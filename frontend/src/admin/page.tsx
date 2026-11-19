import { fmtNum } from '@/lib/format'
import { getMe, getDashboardStats } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

/** Program-admin overview: snapshot totals from the mirror (offline demo). */
export default function AdminPage() {
  usePageTitle('Admin')
  const me = usePageData(getMe, [])
  const stats = usePageData(getDashboardStats, [])

  if (me.isLoading || stats.isLoading) return <LoadingSkeleton />
  if (me.error || stats.error) return <ErrorState error={(me.error ?? stats.error)!} />
  if (!me.data || !stats.data) return null

  const cards = [
    { label: 'Total recognitions at EMIDS', value: fmtNum(stats.data.orgRecognitions) },
    { label: 'Your recognitions given', value: fmtNum(stats.data.given) },
    { label: 'Recognitions received', value: fmtNum(stats.data.got) },
  ]

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pt-1 pb-8 lg:px-8">
      <p className="text-[11px] font-extrabold font-mono uppercase tracking-[0.2em] text-brand">Program admin</p>
      <h1 className="mt-1.5 text-[26px] font-bold leading-[1.2] text-[#0b2a4a]">{me.data.full_name} — admin overview</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#e3ebf2] bg-white px-5 py-4">
            <p className="tnum text-[26px] font-extrabold leading-[1.1] text-[#0b2a4a]">{card.value}</p>
            <p className="text-[13px] text-[#55697d]">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
