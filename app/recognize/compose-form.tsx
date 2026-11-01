'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Maximize2, Send, Sparkles, X } from 'lucide-react'
import { Avatar, Card } from '@/components/atoms'
import TemplateCard from '@/components/molecules/TemplateCard'
import { useComposeForm } from '@/hooks/use-compose-form'
import { ROTATE_WORDS, EMAIL_RE } from '@/lib/compose'
import { CORE_VALUES, VALUE_KEYS, VALUE_TEMPLATES, person } from '@/lib/mock-data'
import type { Person } from '@/lib/mock-data'

export interface ComposeFormProps {
  /** Recognizable teammates, sorted by name. */
  people: Person[]
  /** Recipient preset from /recognize?to=<id> — Praise/Recognize buttons use it. */
  initialToId?: string
}

/** The composer heading rolls through "teammate → colleague → manager…". */
export function ComposeForm({ people, initialToId }: ComposeFormProps) {
  const router = useRouter()
  const form = useComposeForm(people)
  const [wordIdx, setWordIdx] = useState(0)
  const [clipW, setClipW] = useState<number | undefined>(undefined)
  const wordRef = useRef<HTMLSpanElement>(null)

  // Preset recipient once (Praise buttons land here with ?to=<id>)
  useEffect(() => {
    if (initialToId) form.addToSel(initialToId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setInterval(() => setWordIdx((v) => (v + 1) % ROTATE_WORDS.length), 2600)
    return () => clearInterval(t)
  }, [])

  useLayoutEffect(() => {
    if (wordRef.current) setClipW(wordRef.current.offsetWidth)
  }, [wordIdx])

  const toResults = useMemo(() => form.pickResults(form.q), [form])
  const toEmail = useMemo(() => form.emailCandidate(form.q), [form])
  const ccResults = useMemo(() => form.pickResults(form.ccq), [form])
  const ccEmail = useMemo(() => form.emailCandidate(form.ccq), [form])

  const sendDisabled = !form.canSend || form.isBusy() || form.status === 'sent'

  return (
    <div className="flex flex-col">
      {/* Heading */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy md:text-[28px]">
          Recognize your{' '}
          <span
            aria-live="polite"
            className="say-shimmer relative inline-flex items-baseline overflow-hidden"
            style={{ width: clipW, transition: 'width 420ms cubic-bezier(0.33, 1, 0.68, 1)' }}
          >
            <span
              key={wordIdx}
              ref={wordRef}
              className="word-roll-cycle whitespace-nowrap font-extrabold"
              style={{ animation: 'word-roll 2600ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
            >
              {ROTATE_WORDS[wordIdx]}
            </span>
          </span>
        </h1>
        <button
          onClick={() => router.back()}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-transparent px-3 text-[13px] font-semibold text-ink transition hover:bg-slate-100"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-x-6 gap-y-5 px-5 py-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: compose column */}
        <div>
          {/* To */}
          <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2 transition focus-within:border-brand/40 focus-within:bg-white">
            <span className="text-[13px] font-bold text-muted">To</span>
            {form.toSel.map((id) => {
              const isEmail = EMAIL_RE.test((form.labels[id] ?? '').trim())
              const label = form.labels[id] ?? (isEmail ? id : person(id).name.split(' ')[0])
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-1 pr-1.5 shadow-card"
                >
                  <Avatar id={id} size={22} />
                  <span className="max-w-[130px] truncate text-[13px] font-semibold text-navy">{label}</span>
                  <button
                    aria-label={`Remove ${label} from To`}
                    onClick={() => form.removeFromToSel(id)}
                    className="text-muted hover:text-coral"
                  >
                    <X size={12} />
                  </button>
                </span>
              )
            })}
            <input
              value={form.q}
              onChange={(e) => form.setQ(e.target.value)}
              placeholder={form.toSel.length ? 'Add more…' : 'Whom do you want to recognise?'}
              className="h-8 min-w-[170px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>
          {form.q.trim() && (
            <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card">
              {toEmail && (
                <button
                  onClick={() => {
                    form.addEmailToTo(toEmail)
                    form.setQ('')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-muted">
                    @
                  </span>
                  <span className="text-[13px] font-semibold text-navy">Add {toEmail}</span>
                  <span className="ml-auto text-[11px] text-muted">not in the directory</span>
                </button>
              )}
              {toResults.length === 0 && !toEmail && (
                <p className="px-3 py-2 text-[13px] text-muted">No match — anyone at emids is eligible.</p>
              )}
              {toResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    form.addToSel(p.id)
                    form.setQ('')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
                >
                  <Avatar id={p.id} size={28} />
                  <span className="text-[13px] font-semibold text-navy">{p.name}</span>
                  <span className="text-[12px] text-muted">{p.title}</span>
                  {form.toSel.includes(p.id) && <span className="ml-auto text-xs font-bold text-mint">Added</span>}
                </button>
              ))}
            </div>
          )}
          {form.errors.toIds && (
            <p role="alert" className="mt-1.5 text-[12px] font-bold text-coral">
              {form.errors.toIds}
            </p>
          )}

          {/* CC */}
          <div className="mt-2.5 flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2 transition focus-within:border-brand/40 focus-within:bg-white">
            <span className="text-[13px] font-bold text-muted">cc</span>
            {form.ccManagers.map((id) => (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full bg-navy/5 border border-line py-0.5 pl-1 pr-2"
              >
                <Avatar id={id} size={20} />
                <span className="text-[12px] font-semibold text-navy">
                  {person(id).name.split(' ')[0] ?? 'Manager'}
                </span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wide text-muted">· manager</span>
              </span>
            ))}
            {form.ccSel.map((id) => {
              const isEmail = EMAIL_RE.test((form.labels[id] ?? '').trim())
              const label = form.labels[id] ?? (isEmail ? id : person(id).name.split(' ')[0])
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-1 pr-1.5 shadow-card"
                >
                  <Avatar id={id} size={22} />
                  <span className="max-w-[130px] truncate text-[13px] font-semibold text-navy">{label}</span>
                  <button
                    aria-label={`Remove ${label} from CC`}
                    onClick={() => form.removeFromCcSel(id)}
                    className="text-muted hover:text-coral"
                  >
                    <X size={12} />
                  </button>
                </span>
              )
            })}
            <input
              value={form.ccq}
              onChange={(e) => form.setCcq(e.target.value)}
              placeholder={
                form.ccSel.length || form.ccManagers.length ? 'Add more…' : 'Anyone else who should hear about this?'
              }
              className="h-7 min-w-[150px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted"
            />
          </div>
          {form.ccq.trim() && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card">
              {ccEmail && (
                <button
                  onClick={() => {
                    form.addEmailToCc(ccEmail)
                    form.setCcq('')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-muted">
                    @
                  </span>
                  <span className="text-[13px] font-semibold text-navy">Add {ccEmail}</span>
                  <span className="ml-auto text-[11px] text-muted">not in the directory</span>
                </button>
              )}
              {ccResults.length === 0 && !ccEmail && (
                <p className="px-3 py-2 text-[13px] text-muted">No match — or already added.</p>
              )}
              {ccResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    form.addToCcSel(p.id)
                    form.setCcq('')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
                >
                  <Avatar id={p.id} size={26} />
                  <span className="text-[13px] font-semibold text-navy">{p.name}</span>
                  <span className="text-[12px] text-muted">{p.title}</span>
                  {p.managerId && (
                    <span className="ml-auto text-[10.5px] font-bold text-muted font-mono uppercase tracking-wide">
                      manager: {person(p.managerId).name.split(' ')[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Values */}
          <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
            Which emids value did they demonstrate?
          </p>
          <div className="flex flex-wrap gap-2">
            {VALUE_KEYS.map((k) => {
              const v = CORE_VALUES[k]
              const on = form.valueKey === k
              return (
                <button
                  key={k}
                  onClick={() => form.chooseValue(k)}
                  className={`rounded-xl border px-3.5 py-2 text-[13px] font-bold transition active:scale-95 ${v.soft} ${v.ink} ${
                    on ? 'border-current' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          {form.errors.valueKey && (
            <p role="alert" className="mt-1.5 text-[12px] font-bold text-coral">
              {form.errors.valueKey}
            </p>
          )}

          {/* Message */}
          <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
            Describe their contribution
          </p>
          <div className="rounded-xl border border-line bg-slate-50 transition focus-within:border-brand/40 focus-within:bg-white">
            <textarea
              value={form.message}
              onChange={(e) => form.setMessage(e.target.value)}
              rows={4}
              placeholder="What made them stand out?"
              className={`w-full resize-none bg-transparent px-4 pt-3 text-[14.5px] leading-relaxed outline-none placeholder:text-muted ${
                form.errors.message ? 'border-coral' : ''
              }`}
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
              <button
                onClick={() => void form.aiDraft()}
                disabled={form.aiBusy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet px-3 py-1.5 text-[12.5px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                <Sparkles size={14} aria-hidden /> {form.aiBusy ? 'Thinking…' : 'Draft for me'}
              </button>
              <button
                onClick={() => form.aiPolish()}
                disabled={form.aiBusy || form.message.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-[12.5px] font-extrabold text-navy transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Sparkles size={14} aria-hidden /> Polish
              </button>
            </div>
          </div>
          {form.errors.message && (
            <p role="alert" className="mt-1 text-[12px] font-bold text-coral">
              {form.errors.message}
            </p>
          )}

          {/* Points */}
          <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
            Attach points
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {form.POINT_PRESETS.map((p: number) => (
              <button
                key={p}
                onClick={() => form.setPoints(p)}
                className={`tnum rounded-xl border py-2.5 text-[13px] font-extrabold transition active:scale-95 ${
                  form.points === p
                    ? 'border-gold bg-gold text-[#3d2b00]'
                    : 'border-line bg-white text-muted hover:border-gold/50 hover:text-ink'
                }`}
              >
                {p === 0 ? 'Skip' : `+${p}`}
              </button>
            ))}
          </div>
          {form.errors.points && (
            <p role="alert" className="mt-1 text-[12px] font-bold text-coral">
              {form.errors.points}
            </p>
          )}
        </div>

        {/* Right: templates + preview */}
        <div className="lg:sticky lg:top-4">
          <p className="mb-1.5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
            Templates
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {(form.activeTpl?.urls ?? VALUE_TEMPLATES.customerFirst[0].urls).map((u, idx) => (
              <button
                key={u}
                onClick={() => form.setVariantIdx(idx)}
                aria-pressed={form.variantIdx === idx}
                aria-label={`Template option ${idx + 1}`}
                className={`relative block w-full overflow-hidden rounded-lg border transition ${
                  form.variantIdx === idx
                    ? 'border-transparent ring-2 ring-brand shadow-lift'
                    : 'border-line bg-brand-soft/40 hover:border-brand/40'
                }`}
                style={{ backgroundImage: `url(${u})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <div className="aspect-[1100/314] w-full" />
                <span className="absolute bottom-1 left-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[9px] font-bold text-navy">
                  {idx + 1}
                </span>
                {form.variantIdx === idx && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white shadow-card">
                    <Check size={10} aria-hidden />
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
            Preview
          </p>
          <div className="relative flex flex-1 flex-col">
            <Card className="overflow-hidden p-0">
              <TemplateCard
                tpl={form.activeTpl ?? undefined}
                url={
                  (form.activeTpl ?? VALUE_TEMPLATES.customerFirst[0]).urls[form.variantIdx] ??
                  VALUE_TEMPLATES.customerFirst[0].urls[0]
                }
                previewValue={form.previewValue}
                recipients={form.recipients}
                points={form.points}
                msg={form.message}
              />
            </Card>
            {form.canSend && (
              <button
                onClick={() => form.setExpanded(true)}
                aria-label="Expand preview"
                className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-navy shadow-card transition hover:bg-white"
              >
                <Maximize2 size={15} aria-hidden />
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => void form.submit()}
              disabled={sendDisabled}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[14px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <Send size={15} aria-hidden /> {form.isBusy() ? 'Sending…' : 'Post it'}
            </button>
          </div>

          {form.status === 'sent' && form.created && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-line bg-mint-soft/40 px-4 py-3 text-[13.5px] font-bold text-navy"
            >
              Recognition sent to{' '}
              {form.created.toIds
                .map((id) => (EMAIL_RE.test(form.labels[id] ?? '') ? form.labels[id] : person(id).name.split(' ')[0]))
                .join(', ')}
              !{form.created.points > 0 && <span className="text-brand"> +{form.created.points} pts</span>}
            </p>
          )}
        </div>
      </div>

      {/* Expanded preview modal */}
      {form.expanded && form.activeTpl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Template preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) form.setExpanded(false)
          }}
        >
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-extrabold text-navy">Final preview · {form.activeTpl.name}</p>
              <button
                onClick={() => form.setExpanded(false)}
                aria-label="Close preview"
                className="rounded-full p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <TemplateCard
              big
              url={form.activeTpl.urls[form.variantIdx] ?? form.activeTpl.urls[0]}
              previewValue={form.previewValue}
              recipients={form.recipients}
              points={form.points}
              msg={form.message}
            />
          </div>
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {form.status === 'sent' ? 'sent' : form.status}
      </p>
    </div>
  )
}
