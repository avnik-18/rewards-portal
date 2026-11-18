import { Check, Maximize2, Send, X } from 'lucide-react'
import TemplateCard from '@/components/molecules/TemplateCard'
import { Card, Modal } from '@/components/atoms'
import { EMAIL_RE } from '@/lib/compose'
import { VALUE_TEMPLATES } from '@/lib/data-api'
import type { ComposeFormApi } from '@/hooks/use-compose-form'
import { person } from '@/lib/data-api'

interface PreviewColumnProps {
  form: ComposeFormApi
  sendDisabled: boolean
}

/** Null-safe demo fallback: the first template anywhere in the catalog. */
const FALLBACK_TEMPLATE = Object.values(VALUE_TEMPLATES).flat()[0] ?? null

/** Right column: template variants, the live postcard preview, send + sent note. */
export default function PreviewColumn({ form, sendDisabled }: PreviewColumnProps) {
  return (
    <div className="lg:sticky lg:top-4">
      <p className="mb-1.5 text-[11.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-muted">Templates</p>
      <div className="grid grid-cols-3 gap-1.5">
        {(form.activeTpl?.urls ?? FALLBACK_TEMPLATE?.urls ?? []).map((imageUrl, optionIndex) => (
          <button
            key={imageUrl}
            onClick={() => form.setVariantIdx(optionIndex)}
            aria-pressed={form.variantIdx === optionIndex}
            aria-label={`Template option ${optionIndex + 1}`}
            className={`relative block w-full overflow-hidden rounded-lg border transition ${
              form.variantIdx === optionIndex
                ? 'border-transparent ring-2 ring-brand shadow-lift'
                : 'border-line bg-brand-soft/40 hover:border-brand/40'
            }`}
            style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="aspect-[1100/314] w-full" />
            <span className="absolute bottom-1 left-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[9px] font-bold text-navy">
              {optionIndex + 1}
            </span>
            {form.variantIdx === optionIndex && (
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
              (form.activeTpl ?? FALLBACK_TEMPLATE)?.urls[form.variantIdx] ?? FALLBACK_TEMPLATE?.urls[0] ?? undefined
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
            .map((id) => (EMAIL_RE.test(form.labels[id] ?? '') ? form.labels[id] : person(id)?.name.split(' ')[0]))
            .join(', ')}
          !{form.created.points > 0 && <span className="text-brand"> +{form.created.points} pts</span>}
        </p>
      )}
    </div>
  )
}

/** The full-screen preview the maximize button opens — built on the shared
 *  Modal atom (focus trap, initial focus, focus return, Escape already there. */
export function ExpandedPreviewModal({ form }: { form: ComposeFormApi }) {
  if (!form.expanded || !form.activeTpl) return null
  return (
    <Modal open onClose={() => form.setExpanded(false)} wide label="Template preview">
      <div className="p-4 sm:p-6">
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
    </Modal>
  )
}
