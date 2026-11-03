'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { Avatar } from '@/components/atoms'
import { EMAIL_RE } from '@/lib/compose'
import type { ComposeFormApi } from '@/hooks/use-compose-form'
import { person } from '@/lib/mock-data'

/** The "To" field: chosen recipients, typed filter, directory + email results. */
export default function ToRecipientField({ form }: { form: ComposeFormApi }) {
  const matchResults = useMemo(() => form.pickResults(form.q), [form])
  const emailCandidate = useMemo(() => form.emailCandidate(form.q), [form])

  return (
    <>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2 transition focus-within:border-brand/40 focus-within:bg-white">
        <span className="text-[13px] font-bold text-muted">To</span>
        {form.toSel.map((id) => {
          const isEmail = EMAIL_RE.test((form.labels[id] ?? '').trim())
          const label = form.labels[id] ?? (isEmail ? id : person(id)?.name.split(' ')[0] ?? id)
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
          onChange={(event) => form.setQ(event.target.value)}
          placeholder={form.toSel.length ? 'Add more…' : 'Whom do you want to recognise?'}
          className="h-8 min-w-[170px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>
      {form.q.trim() && (
        <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card">
          {emailCandidate && (
            <button
              onClick={() => {
                form.addEmailToTo(emailCandidate)
                form.setQ('')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-muted">
                @
              </span>
              <span className="text-[13px] font-semibold text-navy">Add {emailCandidate}</span>
              <span className="ml-auto text-[11px] text-muted">not in the directory</span>
            </button>
          )}
          {matchResults.length === 0 && !emailCandidate && (
            <p className="px-3 py-2 text-[13px] text-muted">No match — anyone at emids is eligible.</p>
          )}
          {matchResults.map((recipient) => (
            <button
              key={recipient.id}
              onClick={() => {
                form.addToSel(recipient.id)
                form.setQ('')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
            >
              <Avatar id={recipient.id} size={28} />
              <span className="text-[13px] font-semibold text-navy">{recipient.name}</span>
              <span className="text-[12px] text-muted">{recipient.title}</span>
              {form.toSel.includes(recipient.id) && <span className="ml-auto text-xs font-bold text-mint">Added</span>}
            </button>
          ))}
        </div>
      )}
      {form.errors.toIds && (
        <p role="alert" className="mt-1.5 text-[12px] font-bold text-coral">
          {form.errors.toIds}
        </p>
      )}
    </>
  )
}
