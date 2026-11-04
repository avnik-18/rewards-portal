export interface EarningBreakdown {
  awards: number
  grants: number
  milestones: number
}

export interface RewardSummary {
  balance: number
  earnedLifetime: number
  breakdown: EarningBreakdown
}

export interface RecognitionReceived {
  id: string
  fromId: string
  when: string
  message: string
  /** Company value badge label, when the sender attached one. */
  value?: string
  /** A public recognition page exists and the message is approved for sharing.
   *  Omit for records marked private — no share button renders for them. */
  shareable?: boolean
  /** Points attached by the sender (template cards only). */
  points?: number
  /** Set when the recognition was composed with a platform template card. */
  template?: { name: string; emoji: string }
  artUrl?: string
  toIds?: string[]
}

export type LedgerKind = 'award' | 'grant' | 'earning' | 'redemption'

export interface LedgerEntry {
  id: string
  kind: LedgerKind
  label: string
  when: string
  /** Negative = points spent/debited, positive = credited. */
  amount: number
}

export const REWARDS_SUMMARY: RewardSummary = {
  balance: 1240,
  earnedLifetime: 4460,
  breakdown: { awards: 2650, grants: 1310, milestones: 500 },
}

export const RECEIVED: RecognitionReceived[] = [
  // template-card recognition — renders as the full postcard, ditto the original
  {
    id: 'rc1',
    fromId: 'p2',
    when: 'Yesterday',
    message:
      'Aarav took the hard ticket nobody wanted and drove it end-to-end: root cause, fix, and a repro test so it never comes back.',
    value: 'Customer first',
    points: 25,
    template: { name: 'Service Star', emoji: '⭐' },
    artUrl: '/xoxo/customer_first_01.webp',
    toIds: ['me'],
  },
  {
    id: 'rc2',
    fromId: 'p1',
    when: '3d ago',
    message: 'Aarav — thanks for unblocking the pipeline on a Friday evening.',
  },
  // mentions unshipped incident details — marked private, so it cannot be shared
  {
    id: 'rc3',
    fromId: 'p6',
    when: 'Last week',
    message: 'Your review caught the data-leak before the demo. Saved us.',
    value: 'Customer first',
    shareable: false,
  },
]

export const LEDGER: LedgerEntry[] = [
  { id: 'le1', kind: 'redemption', label: 'Redeemed · Bookstore catalogue', when: 'This week', amount: -500 },
  { id: 'le2', kind: 'award', label: 'EoQ Q3 · Data Steward award', when: 'Last week', amount: 750 },
  { id: 'le3', kind: 'grant', label: 'Kudos from Daniel Cho', when: '2 weeks ago', amount: 60 },
  { id: 'le4', kind: 'earning', label: 'Peer kudos · Priya Menon', when: '2 weeks ago', amount: 90 },
  { id: 'le5', kind: 'grant', label: 'Manager grant · spot bonus', when: 'Oct', amount: 400 },
  { id: 'le6', kind: 'award', label: 'Milestone · 1 year at emids', when: 'Sep', amount: 500 },
]

