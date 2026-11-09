import { X } from 'lucide-react'
import { Avatar } from '@/components/atoms'
import { EMAIL_RE } from '@/lib/compose'
import type { ComposeFormApi } from '@/hooks/use-compose-form'
import { person } from '@/lib/data-api'

/** The "cc" field: auto-added managers, chosen extras, typed filter. */
export default function CcRecipientField({ form }: { form: ComposeFormApi }) {
  // Recomputed per render on purpose — `form` changes identity every render,
  // so memoizing these against it only added indirection (sir's review).
  const matchResults = form.pickResults(form.ccq)
  const emailCandidate = form.emailCandidate(form.ccq)

  return (
    <>
      <div className="mt-2.5 flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2 transition focus-within:border-brand/40 focus-within:bg-white">
        <span className="text-[13px] font-bold text-muted">cc</span>
        {form.ccManagers.map((id) => (
          <span
            key={id}
            className="flex items-center gap-1.5 rounded-full bg-navy/5 border border-line py-0.5 pl-1 pr-2"
          >
            <Avatar id={id} size={20} />
            <span className="text-[12px] font-semibold text-navy">{person(id)?.name.split(' ')[0] ?? 'Manager'}</span>
            <span className="text-[10px] font-bold font-mono uppercase tracking-wide text-muted">· manager</span>
          </span>
        ))}
        {form.ccSel.map((id) => {
          const isEmail = EMAIL_RE.test((form.labels[id] ?? '').trim())
          const label = form.labels[id] ?? (isEmail ? id : (person(id)?.name.split(' ')[0] ?? id))
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
          onChange={(event) => form.setCcq(event.target.value)}
          placeholder={
            form.ccSel.length || form.ccManagers.length ? 'Add more…' : 'Anyone else who should hear about this?'
          }
          className="h-7 min-w-[150px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted"
        />
      </div>
      {form.ccq.trim() && (
        <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card">
          {emailCandidate && (
            <button
              onClick={() => {
                form.addEmailToCc(emailCandidate)
                form.setCcq('')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-muted">
                @
              </span>
              <span className="text-[13px] font-semibold text-navy">Add {emailCandidate}</span>
              <span className="ml-auto text-[11px] text-muted">not in the directory</span>
            </button>
          )}
          {matchResults.length === 0 && !emailCandidate && (
            <p className="px-3 py-2 text-[13px] text-muted">No match — or already added.</p>
          )}
          {matchResults.map((recipient) => (
            <button
              key={recipient.id}
              onClick={() => {
                form.addToCcSel(recipient.id)
                form.setCcq('')
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
            >
              <Avatar id={recipient.id} size={26} />
              <span className="text-[13px] font-semibold text-navy">{recipient.name}</span>
              <span className="text-[12px] text-muted">{recipient.title}</span>
              {recipient.managerId && (
                <span className="ml-auto text-[10.5px] font-bold text-muted font-mono uppercase tracking-wide">
                  manager: {person(recipient.managerId)?.name.split(' ')[0]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
