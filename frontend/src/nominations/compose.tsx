import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Award, Check, Loader2, Users } from 'lucide-react'
import {
  getOpenAwards,
  getPeopleDirectory,
  getTeamChoices,
  createNominationDraft,
  submitNomination,
  type NominatedAward,
  type NomineeRow,
} from '@/lib/data-api'
import { usePageData } from '@/hooks/use-page-data'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorState, LoadingSkeleton } from '../load-ui'

/* The backend validates these exact emids_values keys (alembic seed) — the
 * composer sends the snake_case ids; labels here are display-only. */
const VALUE_KEYS = [
  'impact_obsessed',
  'trusted_guides',
  'inclusive_innovators',
] as const

const VALUE_LABELS: Record<string, string> = {
  impact_obsessed: 'Impact Obsessed',
  trusted_guides: 'Trusted Guides',
  inclusive_innovators: 'Inclusive Innovators',
}

type SendError = { code: string; message: string }

/** UX wire for the compose error codes the backend raises on submit. */
const ERROR_COPY: Record<string, string> = {
  quota_exhausted: 'That quota is used up for this quarter — pick another award or try next quarter.',
  duplicate_nomination: 'This person/team already has an active nomination for this award.',
  ineligible: 'The nominee does not meet this award’s eligibility rules.',
  team_size_invalid: 'This award needs more team members than you picked.',
  self_blocked: 'This award does not accept self-nominations.',
  award_not_open: 'This award’s cycle is not open for nominations right now.',
  value_unknown: 'One of the picked values is not recognized.',
  nomination_not_editable: 'This nomination already moved on — open it from the list to follow along.',
  person_not_found: 'That person is not in the directory anymore.',
  team_size_missing: 'Pick a team first.',
}

export function describeSendError(code: string): string {
  return ERROR_COPY[code] ?? 'Could not submit the nomination — check the fields and try again.'
}

function AwardTile({ award, picked, onPick }: { award: NominatedAward; picked: boolean; onPick: () => void }) {
  const quotaNotes = award.quotas
    .map((q) => `${q.scope_value === 'COMPANY' ? 'Company' : q.scope_value}: ${q.used}/${q.max_count}`)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        picked ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30' : 'border-line bg-white hover:border-gold-soft'
      }`}
    >
      <span className="flex items-center gap-2">
        {picked && <Check size={15} aria-hidden className="text-brand" />}
        <span className="text-[14.5px] font-bold text-ink">{award.name}</span>
        <span className="tnum ml-auto text-[12px] font-black text-gold-ink">{award.prize_points.toLocaleString()} pts</span>
      </span>
      {award.description && <span className="mt-1 block text-[12.5px] leading-snug text-muted">{award.description}</span>}
      <span className="mt-1.5 block text-[11.5px] text-muted">
        {award.allow_team ? `Teams of ${award.min_team_size}+` : 'Individuals'}
        {award.grades.length > 0 ? ` · ${award.grades.join('/')}` : ''}
        {award.min_tenure_months ? ` · ${award.min_tenure_months}mo tenure` : ''}
        {quotaNotes ? ` · quota ${quotaNotes}` : ''}
        {' · '}
        {award.used_by_nominator}/{award.max_nominations_per_nominator} of yours used
      </span>
    </button>
  )
}

export default function NominationCompose() {
  usePageTitle('Nominate for an award')
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const awardParam = search.get('award')
  const nomineeParam = search.get('nominee')

  const awards = usePageData(getOpenAwards, [])
  const people = usePageData(getPeopleDirectory, [])
  const teams = usePageData(getTeamChoices, [])

  const [awardId, setAwardId] = useState(awardParam ?? '')
  const [mode, setMode] = useState<'person' | 'team' | null>(nomineeParam ? 'person' : null)
  const [nomineeId, setNomineeId] = useState(nomineeParam ?? '')
  const [teamId, setTeamId] = useState('')
  const [story, setStory] = useState('')
  const [values, setValues] = useState<string[]>([])
  const [achievements, setAchievements] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [sendState, setSendState] = useState<'idle' | 'sending'>('idle')
  const [sendError, setSendError] = useState<SendError | null>(null)
  const [review, setReview] = useState(false)

  const award = useMemo(
    () => (awards.data ?? []).find((a) => a.award_id === awardId) ?? null,
    [awards.data, awardId],
  )
  const nominee = (people.data ?? []).find((p) => p.id === nomineeId) ?? null
  const team = (teams.data ?? []).find((t) => t.team_id === teamId) ?? null

  const toggleValue = (key: string) =>
    setValues((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : cur.length < 5 ? [...cur, key] : cur))

  const problems: string[] = []
  if (!award) problems.push('Pick an award.')
  if (mode === null) problems.push('Pick who this nomination is for.')
  if (mode === 'person' && !nominee) problems.push('Pick the nominee.')
  if (mode === 'team' && !team) problems.push('Pick the team.')
  if (mode === 'team' && award && team && team.member_count < award.min_team_size)
    problems.push(`${award.name} needs at least ${award.min_team_size} members — “${team.name}” has ${team.member_count}.`)
  if (story.trim().length < 30) problems.push('Write the story (at least 30 characters).')
  if (award && !award.allow_self && nominee?.id && false) problems.push('') // keep quiet; server enforces

  const reviewData = {
    award,
    nominee,
    team,
    story: story.trim(),
    values,
    achievements: achievements.trim() || null,
    docUrl: docUrl.trim() || null,
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (sendState === 'sending' || problems.length > 0) return
    if (!review) {
      setReview(true)
      return
    }
    setSendState('sending')
    setSendError(null)
    try {
      const draft = await createNominationDraft({
        award_id: award!.award_id,
        nominee_id: mode === 'person' ? nomineeId : undefined,
        team_id: mode === 'team' ? teamId : undefined,
        story: story.trim(),
        core_values: values,
        achievements: achievements.trim() || null,
        support_doc_url: docUrl.trim() || null,
      })
      const submitted = await submitNomination(draft.id)
      navigate('/nominations', { state: { submittedRef: submitted.nomination_ref } })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setSendError({ code, message: describeSendError(code) })
      setReview(false)
    } finally {
      setSendState('idle')
    }
  }

  if (awards.isLoading || people.isLoading || teams.isLoading)
    return <LoadingSkeleton label="Loading the award catalogue…" />
  if (awards.error) return <ErrorState error={awards.error} />
  if (people.error) return <ErrorState error={people.error} />
  if (teams.error) return <ErrorState error={teams.error} />

  const openAwards = awards.data ?? []
  const peopleRows = people.data ?? []
  const nomineeName = nominee ? nominee.full_name : ''
  const awardNameLocal = award ? award.name : ''

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-7 px-4 pt-1 pb-6 lg:px-8">
      <Link to="/nominations" className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Award nominations
      </Link>

      {awardParam && award && (
        /* the medal plate — the page's one bold surface: award → nominee in
           large type, gold only where it means a medal */
        <div className="relative flex flex-wrap items-center gap-5 overflow-hidden rounded-2xl bg-[#0f2c42] px-7 py-6 shadow-card">
          <span
            aria-hidden
            className="absolute right-0 top-0 h-full w-1/3"
            style={{ background: 'linear-gradient(100deg, rgba(15,44,66,0) 0%, rgba(245,179,36,0.10) 100%)' }}
          />
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#f7c85c] to-[#d99a00] text-[#5c3d00] shadow-card"
            aria-hidden
          >
            <Award size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-extrabold tracking-tight text-white">
              {award.name}
              <span className="mx-2.5 font-medium text-[#7fa3ba]">→</span>
              <span className="text-[#f7c85c]">{nomineeName ?? (mode === 'team' ? reviewData.team?.name ?? '—' : '—')}</span>
            </h1>
            <p className="tnum mt-2 text-[13px] leading-relaxed text-[#b7cddc]">
              {award.prize_points.toLocaleString()} points ride with the winner. Your story goes to the department head
              first, and the program admin has the last word.
            </p>
          </div>
          <span className="rounded-full border border-[#2c4d66] px-3 py-1 text-[11.5px] font-bold text-[#cfe0ec]">
            Step 3 of 3: the story
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {/* award + nominee are fixed by the My Team handoff — their pickers
              also fall back open whenever the linked award is not actually
              in the open set (e.g. the card pointed at a draft award) */}
          {awardParam && !award && (
            <p className="rounded-2xl border border-[#f2c7c3] bg-[#fdefee] px-4 py-3 text-[13px] font-semibold text-[#b3261e]">
              The award you came from is not open for nominations — pick an open one below.
            </p>
          )}
          {(!awardParam || !award) && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="text-[14px] font-extrabold text-ink">Choose the award</legend>
              {openAwards.map((a) => (
                <AwardTile
                  key={a.award_id}
                  award={a}
                  picked={a.award_id === awardId}
                  onPick={() => {
                    setAwardId(a.award_id)
                    setMode(a.allow_team ? 'team' : 'person')
                    setNomineeId('')
                    setTeamId('')
                  }}
                />
              ))}
              {openAwards.length === 0 && (
                <p className="rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-muted">
                  No awards are open for nomination right now.
                </p>
              )}
            </fieldset>
          )}

          {(!awardParam || !award) && (
            <fieldset className="flex flex-col gap-2.5" disabled={!award}>
              <legend className="text-[14px] font-extrabold text-ink">Who are you nominating</legend>
              {award?.allow_team && (
                <div className="flex gap-2">
                {(['person', 'team'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setNomineeId(''); setTeamId('') }}
                    aria-pressed={mode === m}
                    className={`rounded-xl px-3.5 py-2 text-[13px] font-bold transition ${
                      mode === m ? 'bg-brand text-white' : 'border border-line bg-white text-ink hover:border-gold-soft'
                    }`}
                  >
                    {m === 'person' ? 'A person' : 'A team'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'person' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-bold text-ink">Nominee</span>
                <select
                  value={nomineeId}
                  onChange={(e) => setNomineeId(e.target.value)}
                  className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] font-semibold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Select a person</option>
                  {peopleRows.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} — {p.title ?? ''} ({p.department ?? ''})</option>
                  ))}
                </select>
              </label>
            )}

            {mode === 'team' && (
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink"><Users size={13} aria-hidden /> Team</span>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] font-semibold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  <option value="">Select a team</option>
                  {(teams.data ?? []).map((t) => (
                    <option key={t.team_id} value={t.team_id}>{t.name} — {t.member_count} members</option>
                  ))}
                </select>
                {team && award && team.member_count < award.min_team_size && (
                  <span className="text-[12px] font-semibold text-coral">
                    {award.name} needs at least {award.min_team_size} members; this team has {team.member_count}.
                  </span>
                )}
              </label>
            )}
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-2.5" disabled={!award}>
            <legend className="text-[14px] font-extrabold text-ink">The story</legend>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink">Why do they deserve it?</span>
              <textarea
                rows={5}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="What did they do, and what changed because of it?"
                className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-[#9db3c4] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span
                aria-hidden
                className="h-1 w-full overflow-hidden rounded-full bg-[#e9eef4]"
              >
                <span
                  className={`block h-full transition-all ${story.trim().length >= 30 ? 'bg-[#0f7757]' : 'bg-[#f5b324]'}`}
                  style={{ width: `${Math.min(100, (story.trim().length / 30) * 100)}%` }}
                />
              </span>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink">
                Core values{values.length > 0 ? ` — ${5 - values.length} of 5 left` : ''}
              </span>
              <div className="flex flex-wrap gap-2">
                {VALUE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleValue(key)}
                    aria-pressed={values.includes(key)}
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                      values.includes(key) ? 'bg-brand text-white' : 'border border-line bg-white text-ink hover:border-gold-soft'
                    }`}
                  >
                    {VALUE_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink">Achievements and impact <span className="font-medium text-muted">— optional</span></span>
              <textarea
                rows={3}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="Numbers, saves, deadlines met — the receipts behind the story"
                className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-[#9db3c4] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink">Supporting document <span className="font-medium text-muted">— optional link</span></span>
              <input
                type="url"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
          </fieldset>
        </div>

        {/* The citation preview — what the department head will read */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <span aria-hidden className="block h-1.5 w-full bg-gradient-to-r from-[#f5b324] via-[#f7c85c] to-[#d99a00]" />
            <div className="p-5">
              <p className="text-[12px] font-semibold text-muted">
                {review ? 'This is what the department head will read.' : 'As it will read when submitted.'}
              </p>

              <p className="mt-3 text-[17px] font-extrabold leading-snug text-navy">
                {reviewData.award ? reviewData.award.name : <span className="text-[#9db3c4]">Choose an award</span>}
              </p>
              {reviewData.nominee || reviewData.team ? (
                <p className="mt-1 text-[14px] font-bold text-[#0b6e68]">
                  {mode === 'team'
                    ? `${reviewData.team?.name} — ${reviewData.team?.member_count} people`
                    : reviewData.nominee?.full_name}
                </p>
              ) : (
                <p className="mt-1 text-[14px] text-[#9db3c4]">No one picked yet</p>
              )}

              {values.length > 0 && (
                <span className="mt-2.5 flex flex-wrap gap-1.5">
                  {values.map((v) => (
                    <span key={v} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11.5px] font-bold text-brand">
                      {VALUE_LABELS[v]}
                    </span>
                  ))}
                </span>
              )}

              <p className="mt-3 min-h-[84px] rounded-xl border border-line bg-[#f8fafc] px-3.5 py-3 text-[13px] leading-relaxed text-ink">
                {reviewData.story || <span className="text-[#9db3c4]">Your story shows up here as you type…</span>}
              </p>
              {reviewData.achievements && (
                <p className="tnum mt-2 text-[12px] leading-relaxed text-muted">
                  Achievements: {reviewData.achievements}
                </p>
              )}
              {reviewData.docUrl && (
                <p className="tnum mt-1 truncate text-[12px] text-[#35506b]">
                  Attached: {reviewData.docUrl}
                </p>
              )}

              <div className="mt-3.5 border-t border-line pt-3">
                <p className="tnum flex items-center justify-between text-[12.5px] font-bold text-muted">
                  <span>Prize</span>
                  <span className="text-gold-ink">
                    {reviewData.award ? `${reviewData.award.prize_points.toLocaleString()} pts` : '—'}
                  </span>
                </p>
                <p className="tnum mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-muted">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#e9eef4]">
                    <span
                      aria-hidden
                      className={`block h-full transition-all ${story.trim().length >= 30 ? 'bg-[#0f7757]' : 'bg-[#f5b324]'}`}
                      style={{ width: `${Math.min(100, (story.trim().length / 30) * 100)}%` }}
                    />
                  </span>
                  <span className={story.trim().length >= 30 ? 'tnum text-[#0b6e68]' : 'tnum text-amber-600'}>
                    {story.trim().length}/30
                  </span>
                </p>
              </div>
            </div>
          </div>

          {sendError && (
            <div role="alert" className="rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3 text-[13px] text-coral">
              {sendError.message}
            </div>
          )}
          {problems.length > 0 && !sendError && (
            <ul className="rounded-2xl border border-line bg-[#fdf6e7] px-4 py-3 text-[12.5px] text-[#7a5900]">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}

          <button
            type="submit"
            disabled={sendState === 'sending' || problems.length > 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-[14px] font-bold text-white shadow-card transition hover:bg-brand-deep disabled:opacity-50"
          >
            {sendState === 'sending'
              ? <Loader2 size={16} className="animate-spin" aria-hidden />
              : <Award size={16} aria-hidden />}
            {review ? 'Submit nomination' : 'Review nomination'}
          </button>
          {review && (
            <button
              type="button"
              onClick={() => setReview(false)}
              className="text-[12.5px] font-semibold text-muted hover:text-ink"
            >
              Not quite — back to editing
            </button>
          )}
          <p className="text-[11.5px] leading-relaxed text-muted">
            The Department Head decides first, and the program admin has the last word (a substituted admin steps in if
            either collides with you). Decisions and notes appear on your nominations list.
          </p>
        </aside>
      </form>
    </div>
  )
}

export type { NomineeRow }
