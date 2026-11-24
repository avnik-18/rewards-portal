import { Link } from 'react-router-dom'
import { Award } from 'lucide-react'
import {
  getMe,
  getMyNominations,
  getManagedNominations,
  type NominationRow,
} from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

const STATUS_VIEW: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Submitted', className: 'bg-slate-100 text-slate-600' },
  under_review: { label: 'Pending approval', className: 'bg-blue-100 text-blue-700' },
  endorsed: { label: 'Endorsed', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
  returned: { label: 'Returned for changes', className: 'bg-orange-100 text-orange-700' },
  not_selected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700' },
  result: { label: 'Result', className: 'bg-emerald-100 text-emerald-700' },
}

function StatusChip({ status }: { status: string }) {
  const view = STATUS_VIEW[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${view.className}`}>{view.label}</span>
}

function NominationCard({ row }: { row: NominationRow }) {
  const names = row.is_team_nomination
    ? `${row.team_name ?? 'Team'} — ${row.nominees.map((n) => n.full_name).join(', ')}`
    : row.nominees[0]?.full_name ?? '—'
  return (
    <Link
      key={row.id}
      to={`/nominations/${row.id}`}
      className="flex items-start gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-gold-soft hover:shadow-card"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-ink">
        <Award size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14.5px] font-bold text-ink">{row.award_name}</span>
          <StatusChip status={row.status} />
          <span className="tnum text-[11px] font-mono text-muted">{row.nomination_ref}</span>
        </span>
        <span className="mt-1 block truncate text-[13px] text-muted">
          {names} · nominated by {row.nominator_name}
        </span>
        {row.returned_notes && (
          <span className="mt-1.5 block rounded-lg bg-orange-50 px-2.5 py-1 text-[12px] text-orange-700">
            {row.returned_notes}
          </span>
        )}
      </span>
      <span className="tnum shrink-0 text-[13px] font-black text-gold-ink self-center">{row.prize_points.toLocaleString()} pts</span>
    </Link>
  )
}

function Section({ title, rows, empty }: { title: string; rows: NominationRow[]; empty: string }) {
  return (
    <section>
      <h2 className="text-[15px] font-extrabold text-navy">{title}</h2>
      <div className="mt-2 flex flex-col gap-2.5">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-muted">{empty}</p>
        ) : (
          rows.map((row) => <NominationCard key={row.id} row={row} />)
        )}
      </div>
    </section>
  )
}

export default function NominationsPage() {
  usePageTitle('Award nominations')
  const me = usePageData(getMe, [])
  const mine = usePageData(getMyNominations, [])
  const manage = usePageData(getManagedNominations, [])

  if (me.isLoading || mine.isLoading) return <LoadingSkeleton label="Loading your nominations…" />
  if (me.error) return <ErrorState error={me.error} />
  if (mine.error) return <ErrorState error={mine.error} />

  const persona = me.data?.persona ?? 'employee'
  const mineRows = mine.data ?? []
  const draftRows = mineRows.filter((r) => r.status === 'draft' || r.status === 'returned')
  const sentRows = mineRows.filter((r) => r.status !== 'draft' && r.status !== 'returned')
  const manageRows = persona === 'employee' ? [] : (manage.data ?? [])

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-1 pb-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Award nominations</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">
            The Excellence award nomination lifecycle — draft, validation, approval history.
          </p>
        </div>
        {persona !== 'employee' ? (
          <Link
            to="/nominations/new"
            className="rounded-xl bg-brand px-5 py-2.5 text-[13.5px] font-bold text-white shadow-card transition hover:bg-brand-deep"
          >
            Nominate for an award
          </Link>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-[12.5px] text-muted">
            Nominations are raised by admins and delivery managers — yours here is a view of ones you're part of.
          </p>
        )}
      </div>

      <Section title="Drafts — waiting on you" rows={draftRows} empty="No drafts sitting around." />
      <Section title="Submitted" rows={sentRows} empty="Nothing submitted yet — start one from a dashboard card or the button above." />
      {persona !== 'employee' && (
        <Section title="Every nomination (leaders, DHs & admins)" rows={manageRows} empty="No nominations in the queue yet." />
      )}
    </div>
  )
}

export { STATUS_VIEW, StatusChip }
