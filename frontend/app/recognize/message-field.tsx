'use client'

import { Sparkles } from 'lucide-react'
import type { ComposeFormApi } from '@/hooks/use-compose-form'

/** The message textarea with the AI draft/polish actions and count rules. */
export default function MessageField({ form }: { form: ComposeFormApi }) {
  return (
    <>
      <p className="mb-1.5 mt-5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">
        Describe their contribution
      </p>
      <div className="rounded-xl border border-line bg-slate-50 transition focus-within:border-brand/40 focus-within:bg-white">
        <textarea
          value={form.message}
          onChange={(event) => form.setMessage(event.target.value)}
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
    </>
  )
}
