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
  'customer_first',
  'innovation',
  'collaboration',
  'ownership',
  'winning_mindset',
] as const

const VALUE_LABELS: Record<string, string> = {
  customer_first: 'Customer First',
  innovation: 'Innovation',
  collaboration: 'Collaboration',
  ownership: 'Ownership',
  winning_mindset: 'Winning Mindset',
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
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-1 pb-6 lg:px-8">
      <div>
        <Link to="/nominations" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted hover:text-ink">
          <ArrowLeft size={14} aria-hidden /> Award nominations
        </Link>
        <h1 className="mt-1 text-[22px] font-extrabold text-navy">Nominate for an award</h1>
        <p className="mt-0.5 text-[13.5px] text-muted">
          {awardParam ? (
            nomineeName
              ? <>Nominate <strong className="text-ink">{nomineeName}</strong> for <strong className="text-ink">{awardNameLocal}</strong> — tell the story; validation and routing run on submit.</>
              : <>Nominate for <strong className="text-ink">{awardNameLocal}</strong> — tell the story; validation and routing run on submit.</>
          ) : (
            <>Pick the award, the person or team, and tell the story — validation and routing run on submit.</>
          )}
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {/* award + nominee are fixed by the My Team handoff — their pickers
              only show on the standalone entry when nothing is pre-filled */}
          {!awardParam && (
            <fieldset className="flex flex-col gap-2.5">
              <legend className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">1 · Award</legend>
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

          {!awardParam && (
            <fieldset className="flex flex-col gap-2.5" disabled={!award}>
              <legend className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">2 · Who</legend>
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
            <legend className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">The story</legend>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-bold text-ink">Justification <span className="font-medium text-muted">(min 30 chars)</span></span>
              <textarea
                rows={4}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <span className="tnum text-[11.5px] text-muted">{story.trim().length}/30 min</span>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-bold text-ink">Core values <span className="font-medium text-muted">(up to 5)</span></span>
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
              <span className="text-[12.5px] font-bold text-ink">Achievements & impact <span className="font-medium text-muted">(optional)</span></span>
              <textarea
                rows={3}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-bold text-ink">Supporting document link <span className="font-medium text-muted">(optional)</span></span>
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

        {/* Summary / review column */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">Summary</h2>
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-start gap-2">
                <dt className="w-20 shrink-0 font-bold text-ink">Award</dt>
                <dd className="text-muted">{reviewData.award?.name ?? '—'}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="w-20 shrink-0 font-bold text-ink">{mode === 'team' ? 'Team' : 'Nominee'}</dt>
                <dd className="text-muted">
                  {mode === 'team'
                    ? (reviewData.team ? reviewData.team.name : '—')
                    : (reviewData.nominee?.full_name ?? '—')}
                </dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="w-20 shrink-0 font-bold text-ink">Values</dt>
                <dd className="text-muted">{values.map((v) => VALUE_LABELS[v]).join(', ') || '—'}</dd>
              </div>
            </dl>
          </div>

          {sendError && (
            <div role="alert" className="rounded-2xl border border-coral/30 bg-coral-soft px-4 py-3 text-[13px] text-coral">
              {sendError.message}
            </div>
          )}
          {problems.length > 0 && !sendError && (
            <ul className="rounded-2xl border border-line bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
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
            {review ? 'Confirm and submit' : 'Review nomination'}
          </button>
          {review && (
            <button
              type="button"
              onClick={() => setReview(false)}
              className="text-[12.5px] font-semibold text-muted hover:text-ink"
            >
              ← Back to editing
            </button>
          )}
          <p className="text-[11.5px] leading-relaxed text-muted">
            Submitting routes the nomination to the configured approvers (the nominator's manager chain). You'll track
            the decision and any notes from the nominations list.
          </p>
        </aside>
      </form>
    </div>
  )
}

export type { NomineeRow }
