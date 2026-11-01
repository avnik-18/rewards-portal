'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, Linkedin } from 'lucide-react'
import { Card } from '@/components/atoms'
import TemplateCard from '@/components/molecules/TemplateCard'
import { buildPostDraft, polishPostText, linkedinComposerUrl } from '@/lib/share-post'
import { drawRecognitionCard } from '@/lib/recognition-card'
import { CORE_VALUES, VALUE_KEYS, VALUE_TEMPLATES } from '@/lib/mock-data'
import type { ValueKey } from '@/lib/mock-data'

export interface ShareComposerProps {
  /** Rid of the recognition being shared (drives links, not the post). */
  recognitionId: string
  /** The receiver's own name — the perspective member writing the post. */
  receiverName: string
  /** Name (or names) shown as the giver in the draft. */
  giverNames: string
  /** Value chip label as rendered on cards ("Ownership", ...). */
  valueLabel?: string
  /** Recognition note — used by the suggested-draft button and the card art. */
  message: string
  /** Template banner the sender picked — pre-selects it in the image shelf. */
  artUrl?: string
  onClose: () => void
}

/** The value's banner variants, or a fallback image without a value chip. */
export function imagesForValueLabel(label?: string): string[] {
  // labels arrive card-formatted ("Customer first") while the token file keeps "Customer First"
  const sought = (label ?? '').trim().toLowerCase()
  const key = VALUE_KEYS.find((k) => CORE_VALUES[k].label.toLowerCase() === sought)
  return key ? [...VALUE_TEMPLATES[key][0].urls] : ['/img1.png']
}

/** Step 1 of the 2-step share: polish in OUR app, then LinkedIn review + their Post. */
export default function ShareComposer({
  recognitionId,
  valueLabel,
  message,
  giverNames,
  artUrl,
  onClose,
}: ShareComposerProps) {
  const receiverName = 'you'
  void receiverName
  const images = imagesForValueLabel(valueLabel)
  const [imgIdx, setImgIdx] = useState(() => Math.max(0, artUrl ? images.indexOf(artUrl) : 0))
  // the user's own words start empty — the suggested draft fills on click only
  const [text, setText] = useState('')
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const url = images[imgIdx] ?? images[0]

  /** Guaranteed copy: clipboard API first, hidden-textarea select+execCommand fallback. */
  const copyToClipboard = async (value: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      try {
        const helper = document.createElement('textarea')
        helper.value = value
        helper.style.position = 'fixed'
        helper.style.opacity = '0'
        document.body.appendChild(helper)
        helper.select()
        const ok = document.execCommand('copy')
        helper.remove()
        return ok
      } catch {
        return false
      }
    }
  }

  /* the card recipient is the receiver (the signed-in user sharing their own
     earned recognition) — name comes straight from the receiverName prop. */
  const receiverFirstName = receiverName
  const receiverInitials = receiverName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const renderCardDataUrl = async (): Promise<string> =>
    drawRecognitionCard({
      bannerUrl: url,
      message,
      receiverFirstName: receiverName,
      receiverInitials,
      points: 0,
      valueLabel,
    })

  const copyDraft = async () => {
    if (!text.trim()) return
    const ok = await copyToClipboard(text)
    setCopied(ok ? 'yes' : 'no')
  }

  const downloadCardImage = async () => {
    try {
      const dataUrl = await renderCardDataUrl()
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `emids-recognition-card-${recognitionId}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      // card raster is additive — flag visually, never hard-fail the flow
    }
  }

  /** Step 1 only: save the full card + copy the user's words. LinkedIn never
   * opens itself — the user presses the separate Open button when ready. */
  const prepareForLinkedIn = async () => {
    try {
      const dataUrl = await renderCardDataUrl()
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `emids-recognition-card-${recognitionId}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      // card raster is additive — flag visually, never hard-fail the flow
    }
    if (text.trim()) {
      const ok = await copyToClipboard(text)
      setCopied(ok ? 'yes' : 'no')
    } else {
      setCopied(null)
    }
  }

  const openLinkedIn = () => {
    window.open(linkedinComposerUrl(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-extrabold text-navy">Share this recognition</p>
          <button
            onClick={onClose}
            aria-label="Close share"
            className="rounded-full p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* 1 — the postcard as it will look */}
        <p className="mb-1.5 text-[10.5px] font-extrabold font-mono uppercase tracking-[0.14em] text-muted">
          Your card (optional attach)
        </p>
        <div className="overflow-hidden rounded-2xl border border-[#C9E4F2] bg-white">
          <TemplateCard
            url={url}
            previewValue={
              valueLabel
                ? { label: valueLabel, ink: 'text-brand', soft: 'bg-brand-soft', solid: '#0e9384' }
                : null
            }
            recipients={[]}
            points={0}
            msg={message}
          />
        </div>

        {/* image switcher — any banner of the value's shelf */}
        {images.length > 1 ? (
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {images.map((u, i) => (
              <button
                key={u}
                onClick={() => setImgIdx(i)}
                aria-label={`Card image option ${i + 1}`}
                aria-pressed={imgIdx === i}
                className={`relative block w-full overflow-hidden rounded-md border-2 ${imgIdx === i ? 'border-brand' : 'border-transparent'}`}
                style={{ backgroundImage: `url(${u})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                <span className="block aspect-[1100/240] w-full" />
              </button>
            ))}
          </div>
        ) : null}

        {/* 2 — editable post text, pre-written */}
        <p className="mb-1.5 mt-4 text-[10.5px] font-extrabold font-mono uppercase tracking-[0.14em] text-muted">
          Post text (editable)
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Write or edit your LinkedIn post…"
          className="w-full resize-none rounded-xl border border-line bg-slate-50 px-4 py-3 text-[13px] leading-relaxed outline-none placeholder:text-muted focus:border-brand/40 focus:bg-white"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setText(() =>
                buildPostDraft({ receiver: 'this colleague', giver: giverNames, value: valueLabel, message }),
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-[12.5px] font-extrabold text-navy transition hover:bg-slate-50"
          >
            Use suggested draft
          </button>
          <button
            onClick={() => setText((t) => polishPostText(t))}
            disabled={text.trim().length < 10}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet px-3 py-1.5 text-[12.5px] font-extrabold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Sparkles size={14} aria-hidden /> AI Polish
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            onClick={() => { void prepareForLinkedIn().then(openLinkedIn) }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-6 py-3 text-[14px] font-extrabold text-white transition hover:brightness-110"
          >
            <Linkedin size={16} aria-hidden /> Post
          </button>
        </div>
        {copied === 'yes' && (
          <p role="status" className="mt-2 text-right text-[11.5px] font-bold text-brand">
            Your text copied — Ctrl+V inside LinkedIn.
          </p>
        )}
      </div>
    </div>
  )
}

