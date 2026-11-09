import { useState } from 'react'
import { Linkedin } from 'lucide-react'
import { linkedinShareUrl, recognitionPageUrl } from '@/lib/linkedin'
import ShareComposer from '@/components/organisms/ShareComposer'

export interface LinkedInShareButtonProps {
  /** Recognition record id — builds the canonical page URL for the plain share. */
  recognitionId: string
  /** Optional context — when provided, OUR share composer opens first (step 1),
   * and only then users move surface into LinkedIn (step 2, human-approved). */
  giver?: string
  message?: string
  valueLabel?: string
  /** Template banner picked by the sender — pre-selects it among the value's
   * six variants in the composer. */
  artUrl?: string
  /** Receiver's real name for the card (defaults to a generic honoree). */
  receiverName?: string
}

const TIP = 'Share this recognition on LinkedIn.'

/** Share button — with context it opens the in-app ShareComposer, else the direct LinkedIn tab. */
export default function LinkedInShareButton({
  recognitionId,
  giver,
  message,
  valueLabel,
  artUrl,
  receiverName = 'the honoree',
}: LinkedInShareButtonProps) {
  const [failed, setFailed] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  const hasContext = !!(giver || message || valueLabel)

  const share = () => {
    if (hasContext) {
      setComposerOpen(true)
      return
    }
    try {
      const linkedin = linkedinShareUrl(recognitionPageUrl(recognitionId))
      window.open(linkedin, '_blank', 'noopener,noreferrer')
    } catch {
      setFailed(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        title={TIP}
        aria-label={TIP}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0A66C2] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A66C2]"
      >
        <Linkedin size={14} aria-hidden />
        Share
      </button>
      {failed && (
        <span role="status" className="shrink-0 text-[11.5px] text-muted">
          Couldn&rsquo;t open LinkedIn just now.
        </span>
      )}
      {composerOpen && (
        <ShareComposer
          recognitionId={recognitionId}
          receiverName={receiverName}
          giverNames={giver ?? 'a teammate'}
          valueLabel={valueLabel}
          message={message ?? 'Recognized in the emids Awards and Recognition portal.'}
          artUrl={artUrl}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </>
  )
}
