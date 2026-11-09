import type { ValueKey } from './values'
export interface Slide {
  key: string
  img: string
  title: string
  headline: string
  blurb: string
  cta: string
  cta2?: string
}

export type ApprovalKind = 'points-approval' | 'nomination-endorsement' | 'high-value-redemption'

export interface ApprovalRouteStep {
  step: string
  owner: string
  done: boolean
}

export interface ApprovalItem {
  id: string
  kind: ApprovalKind
  fromId: string
  points?: number
  when: string
  title: string
  detail: string
  toIds?: string[]
  value?: ValueKey
  template?: { name: string; emoji: string }
  artUrl?: string
  route: ApprovalRouteStep[]
  budget: string
}

const approvalItem = (a: ApprovalItem): ApprovalItem => a

export const APPROVALS: ApprovalItem[] = [
  approvalItem({
    id: 'ap2',
    kind: 'points-approval',
    fromId: 'p2',
    points: 50,
    when: '2h ago',
    title: 'Daniel wants to award +50 pts to Priya',
    detail:
      '"Priya pulled the quarterly data pack together overnight so leadership could see the numbers before the review."',
    toIds: ['p3'],
    value: 'customerFirst',
    template: { name: 'Service Star', emoji: '⭐' },
    artUrl: '/xoxo/customer_first_01.webp',
    route: [
      { step: 'Direct manager (you)', owner: 'me', done: false },
      { step: 'Cost-centre head', owner: 'Kavita Nair', done: false },
    ],
    budget: 'Uses 50 of 945 pts remaining team pool',
  }),
  approvalItem({
    id: 'ap1',
    kind: 'high-value-redemption',
    fromId: 'p1',
    points: 500,
    when: 'Yesterday',
    title: 'Aarav requested a ₹500 reward redemption',
    detail: 'Redeems 500 reward points toward the bookstore catalogue. High-value redemptions need an approver check.',
    route: [
      { step: 'Direct manager (you)', owner: 'me', done: false },
      { step: 'Finance desk', owner: 'Finance bot', done: false },
    ],
    budget: "Deducts 500 from Aarav's rewards wallet",
  }),
  approvalItem({
    id: 'ap3',
    kind: 'nomination-endorsement',
    fromId: 'p3',
    when: 'Today',
    title: "Priya endorsed Kenji's quarterly nomination",
    detail: '"Kenji rebuilt the ingestion pipeline to fail gracefully — worth reading before the jury votes."',
    toIds: ['p6'],
    value: 'collaboration',
    template: { name: 'One Team', emoji: '🤝' },
    artUrl: '/xoxo/collaboration_illu_01.webp',
    route: [{ step: 'Endorser (you)', owner: 'me', done: false }],
    budget: 'Endorsement only — no points move',
  }),
  approvalItem({
    id: 'ap4',
    kind: 'points-approval',
    fromId: 'p6',
    points: 120,
    when: '3d ago',
    title: 'Kenji wants to award +120 pts to Daniel',
    detail: '"Daniel reviewed my model end-to-end and caught the data-leak with a day to spare."',
    toIds: ['p2'],
    value: 'winningMindset',
    template: { name: 'Winning Drive', emoji: '🏆' },
    artUrl: '/xoxo/winning_mindset_01.webp',
    route: [
      { step: 'Direct manager (you)', owner: 'me', done: true },
      { step: 'Cost-centre head', owner: 'Kavita Nair', done: false },
    ],
    budget: 'Uses 120 of 945 pts remaining team pool',
  }),
]

export const SHOWCASE_SLIDES: Slide[] = [
  {
    key: 'eoq',
    img: '/img2.webp',
    title: 'EoQ window · Q4',
    headline: 'Nominations close in 19 days',
    blurb: '4 categories open · jury voting starts Nov 3',
    cta: 'Nominate now',
    cta2: 'See categories',
  },
  {
    key: 'awards',
    img: '/img1.webp',
    title: 'Quarterly Awards',
    headline: 'Awards worth 7,500 pts this quarter',
    blurb: 'Nominate the teammate who shipped, saved, and showed up. The jury reads every word.',
    cta: 'Nominate someone',
  },
  {
    key: 'jury',
    img: '/img2.webp',
    title: 'Jury Dashboard',
    headline: 'Your jury ballot is half-cast',
    blurb: 'Round 1 voting is underway — your ballot locks Nov 14, 5 PM IST.',
    cta: 'Cast your vote',
  },
]

/* ---------- Rewards slice ---------- */
