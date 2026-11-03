'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ROTATE_WORDS } from '@/lib/compose'

/** The composer heading rolls through "teammate → colleague → manager…". */
export default function ComposeHeading() {
  const router = useRouter()
  const [wordIndex, setWordIndex] = useState(0)
  const [clipWidth, setClipWidth] = useState<number | undefined>(undefined)
  const wordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const rotateTimer = setInterval(() => setWordIndex((index) => (index + 1) % ROTATE_WORDS.length), 2600)
    return () => clearInterval(rotateTimer)
  }, [])

  useLayoutEffect(() => {
    if (wordRef.current) setClipWidth(wordRef.current.offsetWidth)
  }, [wordIndex])

  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-4">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy md:text-[28px]">
        Recognize your{' '}
        <span
          aria-live="polite"
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
      </h1>
      <button
        onClick={() => router.back()}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-transparent px-3 text-[13px] font-semibold text-ink transition hover:bg-slate-100"
      >
        <ArrowLeft size={16} /> Back
      </button>
    </div>
  )
}
