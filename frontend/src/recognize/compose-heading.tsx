import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROTATE_WORDS } from '@/lib/compose'

/** The composer heading rolls through "teammate → colleague → manager…". */
export default function ComposeHeading() {
  const navigate = useNavigate()
  const [wordIndex, setWordIndex] = useState(0)
  const [clipWidth, setClipWidth] = useState<number | undefined>(undefined)
  const wordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // sir: skip the rotation interval when the user asks for reduced motion
    // (WCAG 2.2.2) — the heading always stays on its first word then
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rotateTimer = setInterval(() => setWordIndex((index) => (index + 1) % ROTATE_WORDS.length), 2600)
    return () => clearInterval(rotateTimer)
  }, [])

  useLayoutEffect(() => {
    if (wordRef.current) setClipWidth(wordRef.current.offsetWidth)
  }, [wordIndex])

  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy md:text-[28px]">
        {/* Screen readers get one stable static heading; the animated word is
            decorative aria-hidden output (sir's review — an aria-live region
            would re-announce the heading every 2.6s). */}
        <span className="sr-only">Recognize your {ROTATE_WORDS[0]}</span>
        <span aria-hidden="true">
          Recognize your{' '}
          <span
            className="say-shimmer relative inline-flex items-baseline overflow-hidden"
            style={{ width: clipWidth, transition: 'width 420ms cubic-bezier(0.33, 1, 0.68, 1)' }}
          >
            <span
              key={wordIndex}
              ref={wordRef}
              className="word-roll-cycle whitespace-nowrap font-extrabold"
              style={{ animation: 'word-roll 2600ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
            >
              {ROTATE_WORDS[wordIndex]}
            </span>
          </span>
        </span>
      </h1>
      <button
        onClick={() => navigate(-1)}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-transparent px-3 text-[13px] font-semibold text-ink transition hover:bg-slate-100"
      >
        <ArrowLeft size={16} /> Back
      </button>
    </div>
  )
}
