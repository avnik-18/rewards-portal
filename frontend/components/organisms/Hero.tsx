import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { Mascot } from '../atoms'
import type { HeroMedia } from '@/lib/data-api'

const RECOGNIZE_PHRASES = [
  'Recognize a teammate',
  'Say Thanks',
  'Appreciate your colleague',
  'Give Kudos',
  'Say Thanks to your manager',
  'Commend your lead',
]

/** Rotating hero headlines — slide in from the left, hold ~3 s, exit to the right. */
const HERO_LINES = [
  { main: 'celebrate the progress.', accent: 'Make their moment.' },
  { main: 'someone had a great week.', accent: 'Say kudos.' },
  { main: 'see something great.', accent: 'Appreciate it.' },
]

function HeroSlide() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const rotateTimer = setInterval(() => setIdx((lineIndex) => (lineIndex + 1) % HERO_LINES.length), 4200)
    return () => clearInterval(rotateTimer)
  }, [])
  const line = HERO_LINES[idx]
  return (
    <span
      key={idx}
      className="hero-slide-cycle inline"
      style={{ animation: 'hero-slide 4200ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
    >
      <span
        className="bg-gradient-to-r from-white via-white to-[#d9fbe9] bg-clip-text text-transparent"
        style={{ textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
      >
        {line.main}
      </span>{' '}
      <span className="relative inline-block">
        <span className="say-shimmer">{line.accent}</span>
        <svg
          className="absolute -bottom-2 left-0 w-full"
          height="8"
          viewBox="0 0 120 8"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M2 6 C 30 1, 90 1, 118 5"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </span>
    </span>
  )
}

function RecognizeCycle({ className = '' }: { className?: string }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const phraseTimer = setInterval(() => setIdx((phraseIndex) => (phraseIndex + 1) % RECOGNIZE_PHRASES.length), 3200)
    return () => clearInterval(phraseTimer)
  }, [])
  return (
    <span aria-live="polite" className="block overflow-hidden">
      <span
        key={idx}
        className={`block ${className}`}
        style={{ animation: 'recognize-fade 1200ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
      >
        {RECOGNIZE_PHRASES[idx]}
      </span>
    </span>
  )
}

function HeroBackdrop({ media }: { media?: HeroMedia }) {
  // DB-driven first: the media registry row's video/poster (poster falls
  // back to the bundled webp since the DB column is nullable); when no
  // live row is served (null) the bundled assets below are the fallback.
  const videoUrl = media?.url ?? '/emids-site-hero.mp4'
  const posterUrl = media?.poster_url ?? '/emids-hero.webp'
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoMissing, setVideoMissing] = useState(false)
  // sir's a11y review #4: the poster is the default for SSR AND the first
  // client paint; <video> mounts only once JS confirms motion is allowed, so
  // reduced-motion users and no-JS renders never get autoplay at all.
  const [videoAllowed, setVideoAllowed] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionState = () => setVideoAllowed(!motionQuery.matches)
    syncMotionState()
    motionQuery.addEventListener('change', syncMotionState)
    return () => motionQuery.removeEventListener('change', syncMotionState)
  }, [])

  // WCAG 2.2.2 — autoplaying motion needs a real, keyboard-operable pause
  // control (click-on-video was neither visible nor reachable at -z-10)
  const togglePlayback = () => {
    const videoNode = videoRef.current
    if (!videoNode) return
    if (videoNode.paused) void videoNode.play()
    else videoNode.pause()
  }

  return (
    <div className="absolute -inset-x-8 -bottom-10 -top-16 -z-10 overflow-hidden">
      {videoAllowed && !videoMissing ? (
        <>
          <video
            ref={videoRef}
            key={videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            src={videoUrl}
            poster={posterUrl}
            aria-hidden
            autoPlay
            muted
            loop
            playsInline
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onError={() => setVideoMissing(true)}
          />
          <button
            type="button"
            onClick={togglePlayback}
            aria-pressed={paused}
            className="absolute right-3 bottom-3 pointer-events-auto z-10 flex items-center gap-2 rounded-full bg-navy-deep/60 px-3 py-1.5 text-[12px] font-semibold text-white/90 backdrop-blur-sm transition hover:bg-navy-deep/80"
          >
            {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
            {paused ? 'Play background video' : 'Pause background video'}
          </button>
        </>
      ) : (
        <img src="/emids-hero.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#030d1c]/80 via-[#030d1c]/60 to-[#030d1c]/55" />
    </div>
  )
}

export default function Hero({ name, media }: { name: string; media?: HeroMedia }) {
  return (
    <div className="relative isolate">
      {/* Fixed height matches the Total-reward-balance tile so the two
          column heads share top AND bottom edges on desktop. */}
      <div className="relative isolate flex h-[226px] items-center overflow-hidden rounded-[28px] shadow-[0_18px_44px_-20px_rgba(3,13,28,0.55)]">
        <HeroBackdrop media={media} />
        <div className="relative z-10 flex w-full flex-col items-start justify-center gap-3 px-7 py-5 sm:px-9 xl:px-10 xl:py-6">
          <h1 className="max-w-3xl text-[38px] font-extrabold leading-[1.08] tracking-[-0.03em]">
            <span
              className="bg-gradient-to-r from-white via-white to-[#d9fbe9] bg-clip-text text-transparent"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
            >
              Hello {name} —{' '}
            </span>
            <HeroSlide />
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/recognize"
              aria-label="Recognize a teammate"
              className="inline-flex w-[300px] shrink-0 items-center justify-center rounded-xl bg-[#4b94a0] px-4 py-3 text-[12.5px] font-extrabold font-mono uppercase tracking-[0.12em] text-[#06222e] transition hover:brightness-110"
            >
              <RecognizeCycle className="whitespace-nowrap" />
            </Link>
            <Mascot />
          </div>
        </div>
      </div>
    </div>
  )
}
