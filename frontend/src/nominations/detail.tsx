import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Award, CircleCheck, CircleX, Undo2, Clock } from 'lucide-react'
import { getNomination, type ApprovalHistoryEntry, type NominationDetail } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'
import { StatusChip } from './page'

function HistoryIcon({ status }: { status: string }) {
  if (status === 'approved') return <CircleCheck size={16} className="text-emerald-600" aria-hidden />
  if (status === 'declined') return <CircleX size={16} className="text-rose-600" aria-hidden />
  if (status === 'returned') return <Undo2 size={16} className="text-orange-600" aria-hidden />
  return <Clock size={16} className="text-slate-400" aria-hidden />
}

const STEP_COPY: Record<string, string> = {
  pending: 'Waiting for their decision',
  approved: 'Approved',
  declined: 'Declined',
  returned: 'Returned for changes',
  skipped: 'Skipped',
  escalated: 'Escalated',
}

function HistoryRow({ entry }: { entry: ApprovalHistoryEntry }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5"><HistoryIcon status={entry.status} /></span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold text-ink">
          {entry.owner_name} <span className="font-mono text-[11px] font-medium text-muted">{entry.level}</span>
        </span>
        <span className="block text-[12.5px] text-muted">{STEP_COPY[entry.status] ?? entry.status}</span>
        {entry.note && (
          <span className="mt-1 block rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-ink">{entry.note}</span>
        )}
        {entry.decided_at && (
          <span className="tnum block text-[11px] text-muted">
            {new Date(entry.decided_at).toLocaleString()}
          </span>
        )}
      </span>
    </li>
  )
}

export default function NominationDetailPage() {
  usePageTitle('Nomination detail')
  const { id } = useParams()
  const detail = usePageData<NominationDetail>(
    () => (id ? getNomination(id) : Promise.reject(new Error('missing nomination id'))),
    [id],
  )

  if (detail.isLoading) return <LoadingSkeleton label="Loading the nomination…" />
  if (detail.error) return <ErrorState error={detail.error} />
  if (!detail.data) return null

  const row = detail.data
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-4 pt-1 pb-6 lg:px-8">
      <div>
        <Link to="/nominations" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink">
          <ArrowLeft size={14} aria-hidden /> Award nominations
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-extrabold text-navy">{row.award_name}</h1>
          <StatusChip status={row.status} />
          <span className="tnum text-[12px] font-mono text-muted">{row.nomination_ref}</span>
        </div>
        <p className="mt-0.5 text-[13px] text-muted">
          {row.is_team_nomination ? `Team ${row.team_name}` : row.nominees[0]?.full_name ?? ''} · nominated by {row.nominator_name}
        </p>
      </div>

      {row.returned_notes && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-[13px] text-orange-800">
          <strong className="font-bold">Returned for changes:</strong> {row.returned_notes}
        </div>
      )}

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">Nomination</h2>
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{row.story}</p>
        {row.achievements && (
          <>
            <h3 className="mt-4 text-[13px] font-bold text-ink">Achievements & impact</h3>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-muted">{row.achievements}</p>
          </>
        )}
        {row.core_values.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {row.core_values.map((v) => (
              <span key={v} className="rounded-full bg-gold-soft px-3 py-1 text-[12px] font-bold text-gold-ink">
                {v.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
        {row.support_doc_url && (
          <a href={row.support_doc_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[13px] font-bold text-brand underline">
            Supporting document
          </a>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.14em] text-muted">
          <Award size={13} aria-hidden /> Approval trail
        </h2>
        {row.approval_history.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">
            No approval steps yet — the chain appears once the nomination is submitted.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-4">
            {row.approval_history.map((h, i) => <HistoryRow key={`${h.seq}-${i}`} entry={h} />)}
          </ol>
        )}
      </section>
    </div>
  )
}
