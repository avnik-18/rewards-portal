import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, ChevronDown, Clock, FileText, Filter, Search, X } from 'lucide-react'
import { getMe, getAwards, type AwardRow, type AwardCadence } from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { AwardMedallion } from '@/components/organisms/awards-illustrations'
import { ErrorState, LoadingSkeleton } from '../load-ui'

const KIND_LABEL: Record<AwardCadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function dateParts(iso: string): { d: number; m: number; y: number } {
  const p = iso.split('-').map(Number)
  return { d: p[2], m: p[1], y: p[0] }
}

/** Days until the deadline day itself (that day still counts as open). */
function deadlineDays(row: AwardRow): number {
  if (row.nominations_end === null) return Infinity
  const t = dateParts(row.nominations_end)
  const end = new Date(t.y, t.m - 1, t.d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / 86_400_000)
}

function fmtDate(iso: string | null): string {
  if (iso === null) return '—'
  const { d, m, y } = dateParts(iso)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

function periodText(row: AwardRow): string {
  const a = dateParts(row.period_start)
  const b = dateParts(row.period_end)
  return `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`
}

/** Award cycle — the leadership/admin Awards & Nominations screen: the
 *  admin-authored catalog (GET /awards) ranked by closing time, with
 *  filters and the nomination hand-off. Employees never land here. */
export default function AwardsCyclePage() {
  usePageTitle('Awards & Nominations')
  const me = usePageData(getMe, [])
  const awards = usePageData(getAwards, [])

  const [kindFilter, setKindFilter] = useState<'all' | AwardCadence>('all')
  const [query, setQuery] = useState('')
  const [sortOpen, setSortOpen] = useState(false)
  // #1 rank: nearest nomination deadline on top across every filter state
  const [rankByClosing, setRankByClosing] = useState(true)
  const [guidelines, setGuidelines] = useState<AwardRow | null>(null)

  if (me.isLoading || awards.isLoading) return <LoadingSkeleton label="Loading awards…" />
  if (me.error) return <ErrorState error={me.error} />
  if (awards.error) return <ErrorState error={awards.error} />

  // The tab only exists for leaders and admins; deep links from elsewhere bounce.
  if (me.data && me.data.persona === 'employee') return <Navigate to="/" replace />
  if (!me.data || !awards.data) return null

  const rows = [...awards.data].sort((a, b) => deadlineDays(a) - deadlineDays(b))
  const presentKinds = (['monthly', 'quarterly', 'annual'] as const).filter(
    (kind) => rows.some((row) => row.cadence === kind),
  )
  const counts = {
    all: rows.length,
    ...Object.fromEntries(presentKinds.map((kind) => [kind, rows.filter((r) => r.cadence === kind).length])),
  } as Record<'all' | AwardCadence, number>
  // the clock the Closing-Soon chip keys on: nearest deadline
  const finiteDays = rows.map(deadlineDays).filter((d) => d !== Infinity)
  const minDays = finiteDays.length ? Math.min(...finiteDays) : null
  const soon = rows.filter((r) => deadlineDays(r) >= 0 && deadlineDays(r) <= 7)

  const q = query.trim().toLowerCase()
  const visible = rows.filter(
    (r) =>
      (kindFilter === 'all' || r.cadence === kindFilter) &&
      (q === '' || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)),
  )

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pt-1 pb-6 lg:px-8">
      {/* Photo ribbon header — real confetti shot, navy scrim, white headline */}
      <div className="relative flex min-h-[176px] flex-col justify-center overflow-hidden rounded-2xl px-7 py-6 text-white shadow-card">
        <img
          src="/awards-hero-band.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '65% 50%' }}
          draggable={false}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(92deg, rgba(9,34,42,0.55) 0%, rgba(9,34,42,0.28) 42%, rgba(9,34,42,0) 72%)',
          }}
        />
        <div className="relative">
          <h1 className="text-[30px] font-extrabold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            Awards &amp; Nominations
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[14.5px] leading-relaxed text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            Explore ongoing awards and recognize outstanding contributions.
          </p>
        </div>
      </div>

      {/* Stat tiles — slim, exactly the reference pairing */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-[#d5ece1] bg-[#edf8f1] px-5 py-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d9f2e4] text-[18px]">
            🏆
          </span>
          <p className="tnum text-[22px] font-black leading-none text-[#0b2a4a]">{counts.all}</p>
          <div className="min-w-0 flex-1 border-l border-[#d5ece1] pl-4">
            <p className="text-[13px] font-bold text-[#0b2a4a]">Ongoing Awards</p>
            <p className="truncate text-[12px] text-[#55697d]">Explore and nominate for these awards</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-4 rounded-2xl border px-5 py-3.5 ${
            soon.length ? 'border-[#f2c7c3] bg-[#fdefee]' : 'border-[#e3ebf2] bg-white'
          }`}
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] ${
              soon.length ? 'bg-[#f7d7d3] text-[#b3261e]' : 'bg-[#eef2fb] text-[#35506b]'
            }`}
            aria-hidden
          >
            {soon.length ? '⏰' : '🕐'}
          </span>
          <p
            className={`tnum text-[22px] font-black leading-none ${
              soon.length ? 'text-[#b3261e]' : 'text-[#0b2a4a]'
            }`}
          >
            {soon.length}
          </p>
          <div className="min-w-0 flex-1 border-l border-[#f2c7c3] pl-4">
            <p className={`text-[13px] font-bold ${soon.length ? 'text-[#b3261e]' : 'text-[#0b2a4a]'}`}>
              {soon.length ? 'Closing Soon' : 'No imminent deadlines'}
            </p>
            {soon.length !== 0 && minDays !== null && (
              <p className="truncate text-[12px] text-[#55697d]">
                Nomination ends in <span className="font-bold text-[#b3261e]">{minDays} {minDays === 1 ? 'day' : 'days'}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-2">
          {(['all', ...presentKinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                kindFilter === k
                  ? 'bg-[#0f6b60] text-white'
                  : 'border border-[#e3ebf2] bg-white text-[#35506b] hover:border-[#0e9384]'
              }`}
            >
              {k === 'all' ? `All Awards (${counts.all})` : `${KIND_LABEL[k]} (${counts[k]})`}
            </button>
          ))}
        </div>
        <div className="flex flex-1 justify-end gap-2.5">
          <div className="relative w-full max-w-[240px]">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8aa2b8]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search awards..."
              aria-label="Search awards"
              className="w-full rounded-xl border border-[#e3ebf2] bg-white py-2 pl-8 pr-2.5 text-[13px] font-medium text-[#16324f] shadow-card placeholder:text-[#8aa2b8] focus:border-[#0e9384] focus:outline-none focus:ring-2 focus:ring-[#0e9384]/30"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-[#e3ebf2] bg-white px-3.5 py-2 text-[13px] font-bold text-[#35506b] shadow-card transition hover:border-[#0e9384]"
            >
              <Filter size={14} aria-hidden />
              Filter
              <ChevronDown size={13} aria-hidden className={`transition ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-xl border border-[#e3ebf2] bg-white p-1 shadow-card">
                {(
                  [
                    { label: 'Rank by closing time', on: rankByClosing },
                    { label: 'All awards (as cataloged)', on: !rankByClosing },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setRankByClosing(opt.on)
                      setSortOpen(false)
                    }}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-[12.5px] font-bold transition hover:bg-[#f1f5f9] ${
                      opt.on ? 'text-[#0f6b60]' : 'text-[#55697d]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Award cards — reference anatomy: medallion · name block · kind chip ·
          Award Period · Nomination Deadline · Nominate, one line each. */}
      <div className="flex flex-col gap-3.5">
        {visible.map((row) => {
          const left = deadlineDays(row)
          const closing = left >= 0 && left <= 7
          return (
            <div
              key={row.id}
              className={`grid items-center gap-4 rounded-2xl border px-5 py-4 lg:grid-cols-[104px_minmax(0,1fr)_110px_minmax(0,150px)_minmax(0,170px)_auto] ${
                closing ? 'border-[#f2c7c3] bg-[#fdf0ef]' : 'border-[#e3ebf2] bg-white'
              }`}
            >
              <span className="h-[72px] w-[72px] shrink-0 justify-self-center lg:h-[96px] lg:w-[96px]">
                <AwardMedallion kind={row.cadence} />
              </span>

              <div className="min-w-0">
                <h2 className="text-[15.5px] font-extrabold text-[#0b2a4a]">{row.name}</h2>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#55697d]">{row.description}</p>
                <button
                  type="button"
                  onClick={() => setGuidelines(row)}
                  className="mt-1.5 flex items-center gap-1 text-[12px] font-bold text-[#0b6e68] transition hover:text-[#0f6b60]"
                >
                  <FileText size={13} aria-hidden />
                  Guidelines
                  <ChevronDown size={12} aria-hidden className="-rotate-90" />
                </button>
              </div>

              <div className="justify-self-start lg:justify-self-center">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-[11.5px] font-bold ${
                    row.cadence === 'monthly'
                      ? 'bg-[#fdeae6] text-[#b3261e]'
                      : row.cadence === 'quarterly'
                        ? 'bg-[#e6f6f4] text-[#0b6e68]'
                        : 'bg-[#eaf3fa] text-[#35506b]'
                  }`}
                >
                  {KIND_LABEL[row.cadence]}
                </span>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#55697d]">
                  <CalendarDays size={14} aria-hidden />
                  Award Period
                </p>
                <p className="tnum mt-1 text-[12.5px] font-bold text-[#16324f]">{periodText(row)}</p>
              </div>

              <div className="relative">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#55697d]">
                  <Clock size={14} aria-hidden />
                  Nomination Deadline
                </p>
                <p className="tnum mt-1 text-[12.5px] font-extrabold text-[#d24a42]">{fmtDate(row.nominations_end)}</p>
                {closing && (
                  <span className="tnum absolute -top-8 right-0 hidden rounded-full bg-[#fdeea9] px-2.5 py-1 text-[11px] font-bold text-[#8a5a00] lg:inline-flex lg:items-center lg:gap-1">
                    ⏰ Closing in {left} {left === 1 ? 'day' : 'days'}
                  </span>
                )}
              </div>

              <Link
                to={`/team?award=${row.id}`}
                className={`group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-card transition ${
                  closing ? 'bg-[#0f7757] hover:bg-[#0b6e4f]' : 'bg-[#153B5A] hover:brightness-110'
                }`}
              >
                Nominate Employee
                <ArrowRight size={14} aria-hidden className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          )
        })}
        {visible.length === 0 && (
          <p className="rounded-2xl border border-[#e3ebf2] bg-white p-8 text-center text-[14px] text-[#55697d]">
            No awards match — clear the search or pick another category.
          </p>
        )}
      </div>

      {/* Guidelines modal — eligibility / applicability straight from the DB */}
      {guidelines && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a4a]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${guidelines.name} guidelines`}
          onClick={() => setGuidelines(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(mouseEvent) => mouseEvent.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="h-14 w-14 shrink-0" aria-hidden>
                  <AwardMedallion kind={guidelines.cadence} />
                </span>
                <div>
                  <p className="text-[16px] font-extrabold text-[#0b2a4a]">{guidelines.name}</p>
                  <p className="text-[12.5px] font-semibold text-[#0b6e68]">{KIND_LABEL[guidelines.cadence]} award</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuidelines(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[#55697d] transition hover:bg-[#f1f5f9]"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-[13px]">
              {(
                [
                  ['Award period', periodText(guidelines)],
                  ['Nomination deadline', fmtDate(guidelines.nominations_end)],
                  ['Prize', `${guidelines.prize_points.toLocaleString()} points to the winner`],
                  ['Nomination quota', `${guidelines.nomination_quota} per nominator`],
                  ['Jury', guidelines.requires_jury ? 'Nominations pass the approvals queue, then the jury votes' : 'Endorsed by your approver — no jury vote'],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-36 shrink-0 font-bold text-[#55697d]">{k}</dt>
                  <dd className="text-[#16324f]">{v}</dd>
                </div>
              ))}
            </dl>
            {guidelines.guidelines.map((section, index) => (
              <div
                key={section.title}
                className={`mt-3 rounded-xl border border-[#e3ebf2] bg-[#f8fafc] px-4 py-3 ${index === 0 ? 'mt-4' : ''}`}
              >
                <p className="text-[11.5px] font-extrabold font-mono uppercase tracking-[0.1em] text-[#55697d]">
                  {section.title}
                </p>
                <ul className="mt-1.5 list-disc pl-4 text-[13px] leading-relaxed text-[#16324f]">
                  {section.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
            <Link
              to={`/team?award=${guidelines.id}`}
              onClick={() => setGuidelines(null)}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#153B5A] py-2.5 text-[13.5px] font-bold text-white transition hover:brightness-110"
            >
              Nominate Employee
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
