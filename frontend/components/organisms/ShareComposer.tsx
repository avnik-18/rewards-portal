'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, Linkedin } from 'lucide-react'
import ShareCardShelf from '@/components/organisms/share-card-shelf'
import { buildPostDraft, polishPostText, linkedinComposerUrl } from '@/lib/share-post'
import { drawRecognitionCard } from '@/lib/recognition-card'
import { copyTextToClipboard, imagesForValueLabel, saveCardImage } from '@/components/organisms/share-helpers'

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

/** Step 1 of the 2-step share: polish in OUR app, then LinkedIn review + their Post. */
export default function ShareComposer({
  recognitionId,
  valueLabel,
  message,
  giverNames,
  artUrl,
  onClose,
}: ShareComposerProps) {
  // the card recipient is the receiver (the signed-in user sharing their own
  // earned recognition) — the perspective name is simply "you"
  const receiverName = 'you'
  const receiverInitials = receiverName
    .split(' ')
    .map((namePart) => namePart[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const cards = imagesForValueLabel(valueLabel)
  const [imageIndex, setImageIndex] = useState(() => Math.max(0, artUrl ? cards.indexOf(artUrl) : 0))
  // the user's own words start empty — the suggested draft fills on click only
  const [text, setText] = useState('')
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const selectedCard = cards[imageIndex] ?? cards[0]

  const shareCardDataUrl = async (): Promise<string> =>
    drawRecognitionCard({
      bannerUrl: selectedCard,
      message,
      receiverFirstName: receiverName,
      receiverInitials,
      points: 0,
      valueLabel,
    })

  const saveRasteredCard = async () => {
    try {
      const dataUrl = await shareCardDataUrl()
      saveCardImage(dataUrl, `emids-recognition-card-${recognitionId}.png`)
    } catch {
      // card raster is additive — flag visually, never hard-fail the flow
    }
  }

  /** Step 1 only: save the full card + copy the user's words. LinkedIn never
   * opens itself — the user presses the separate Open button when ready. */
  const prepareForLinkedIn = async () => {
    await saveRasteredCard()
    if (text.trim()) {
      const ok = await copyTextToClipboard(text)
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
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose()
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
        <ShareCardShelf
          cards={cards}
          selectedCard={selectedCard}
          onSelectCard={setImageIndex}
          valueLabel={valueLabel}
          message={message}
        />

        {/* 2 — editable post text, pre-written */}
        <p className="mb-1.5 mt-4 text-[10.5px] font-extrabold font-mono uppercase tracking-[0.14em] text-muted">
          Post text (editable)
        </p>
        <textarea
          value={text}
          onChange={(inputEvent) => setText(inputEvent.target.value)}
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
            onClick={() => setText((currentText) => polishPostText(currentText))}
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
