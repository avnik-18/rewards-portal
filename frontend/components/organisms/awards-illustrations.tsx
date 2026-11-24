import type { ReactNode } from 'react'

/** Hand-drawn illustrations for the Awards & Nominations screen — flat vector
 *  medallions in the portal palette (no external assets to track or license).
 *  Each fills its own square and scales via viewBox. */

export function GoldTrophyArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#fdeae6" />
      {/* laurels */}
      <g stroke="#d8a12f" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M17 47c-3 3-4 8-2 12 4-1 8-4 9-9" />
        <path d="M17 63c-1 4 1 9 5 11 2-4 2-9-1-12" />
        <path d="M103 47c3 3 4 8 2 12-4-1-8-4-9-9" />
        <path d="M103 63c1 4-1 9-5 11-2-4-2-9 1-12" />
      </g>
      {/* cup */}
      <path
        d="M45 40h30l-2 12c-1 9-6 15-13 15s-12-6-13-15l-2-12z"
        fill="url(#cupGold)"
        stroke="#c98f24"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M45 44c-7-1-13 2-14 8s3 11 10 12" fill="none" stroke="#c98f24" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M75 44c7-1 13 2 14 8s-3 11-10 12" fill="none" stroke="#c98f24" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="55" y="66" width="10" height="10" fill="url(#cupGold)" stroke="#c98f24" strokeWidth="2" />
      <rect x="44" y="76" width="32" height="8" rx="2.5" fill="#8a5a08" />
      <rect x="40" y="84" width="40" height="6" rx="2.5" fill="#b8860b" />
      <path d="M52 46l6 6 11-9" fill="none" stroke="#fff7e0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="cupGold" x1="45" y1="40" x2="75" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f6c945" />
          <stop offset="1" stopColor="#dd9b1d" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function TargetArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#e9f7f5" />
      <circle cx="58" cy="62" r="30" fill="#ffffff" stroke="#0b6e68" strokeWidth="4" />
      <circle cx="58" cy="62" r="20" fill="#dff2ef" stroke="#0b6e68" strokeWidth="4" />
      <circle cx="58" cy="62" r="10" fill="#0e9384" stroke="#0a675c" strokeWidth="3" />
      <circle cx="58" cy="62" r="3.5" fill="#ffffff" />
      <g stroke="#154071" strokeWidth="4" strokeLinecap="round">
        <path d="M58 62L94 26" />
        <path d="M94 26l-8 1-3-7" strokeLinejoin="round" fill="#154071" />
        <path d="M94 26l-2 8 7 3" strokeLinejoin="round" fill="#154071" stroke="none" opacity="0.85" />
      </g>
      <path d="M84 20l6 6" stroke="#f5b324" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function PeopleStarArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <circle cx="60" cy="60" r="52" fill="#eaf3fa" />
      {/* three silhouettes */}
      <g fill="#35707e">
        <circle cx="38" cy="66" r="12" />
        <path d="M20 92c0-10 8-17 18-17s18 7 18 17z" />
        <circle cx="82" cy="66" r="12" />
        <path d="M64 92c0-10 8-17 18-17s18 7 18 17z" />
        <circle cx="60" cy="58" r="14" fill="#0b6e68" />
        <path d="M40 92c0-12 9-20 20-20s20 8 20 20z" fill="#0b6e68" />
      </g>
      {/* star on top */}
      <path d="M60 16l4.8 9.7 10.7 1.6-7.7 7.5 1.8 10.6L60 40.6l-9.6 5 1.8-10.6-7.7-7.5 10.7-1.6z" fill="#f5b324" />
    </svg>
  )
}

/** The polished gold trophy standing on the header band's right edge. */
export function TrophyStarArt() {
  return (
    <svg viewBox="0 0 220 220" className="h-full w-full" aria-hidden>
      {/* soft ground shadow */}
      <ellipse cx="110" cy="196" rx="66" ry="10" fill="rgba(11,42,74,0.12)" />
      {/* handles */}
      <path d="M126 74c14-3 25 3 26 14 1 12-8 20-20 20" fill="none" stroke="url(#goldEdge)" strokeWidth="7" strokeLinecap="round" />
      <path d="M94 74c-14-3-25 3-26 14-1 12 8 20 20 20" fill="none" stroke="url(#goldEdge)" strokeWidth="7" strokeLinecap="round" />
      {/* cup bowl */}
      <path
        d="M85 66h50l-3.5 16c-2.5 15-11 24-21.5 24S91 97 88.5 82z"
        fill="url(#goldFace)"
        stroke="#c98f24"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M92 70l-1.8 14c-1.5 9 3 15 8 17-7-3-9-9-8.2-17l1.4-14z" fill="#fff2c8" opacity="0.7" />
      {/* stem + base */}
      <rect x="104" y="106" width="12" height="14" rx="2" fill="url(#goldFace)" stroke="#c98f24" strokeWidth="2" />
      <rect x="92" y="120" width="36" height="10" rx="3" fill="#8a5a08" />
      <rect x="80" y="130" width="60" height="16" rx="4" fill="url(#goldFace)" stroke="#c98f24" strokeWidth="2.5" />
      {/* engraved plaque */}
      <rect x="92" y="136" width="36" height="5" rx="2.5" fill="#8a5a08" opacity="0.75" />
      {/* star topper */}
      <path
        d="M110 18l6 12.2 13.4 1.9-9.7 9.4 2.3 13.3-12-6.3-12 6.3 2.3-13.3-9.7-9.4 13.4-1.9z"
        fill="url(#goldFace)"
        stroke="#c98f24"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M110 22l4 8.4 9.2 1.3-6.6 6.5 1.6 9.4L110 33z" fill="#fff2c8" opacity="0.8" />
      {/* sparkles */}
      <g stroke="#fff7dd" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <path d="M150 34v10M145 39h10" />
        <path d="M70 30v8M66 34h8" />
        <path d="M160 96v8M156 100h8" />
      </g>
      <defs>
        <linearGradient id="goldFace" x1="85" y1="18" x2="135" y2="146" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8d24e" />
          <stop offset="0.55" stopColor="#eaa227" />
          <stop offset="1" stopColor="#c9831d" />
        </linearGradient>
        <linearGradient id="goldEdge" x1="60" y1="66" x2="160" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d99a25" />
          <stop offset="1" stopColor="#c9831d" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Back-compat alias — the old name pointed at the rough crystal. */
export function CrystalTrophyArt() {
  return <TrophyStarArt />
}

/** The colored medallion wrap each award card uses. */
export function AwardMedallion({ kind }: { kind: 'monthly' | 'quarterly' | 'annual' }): ReactNode {
  if (kind === 'annual') return <PeopleStarArt />
  if (kind === 'quarterly') return <TargetArt />
  return <GoldTrophyArt />
}
