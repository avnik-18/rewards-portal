// Mock data — trimmed port of src/data.ts, dashboard datasets only.
// This is the ONLY file the dashboard talks to today; data-api.ts wraps it so
// Ayan's FastAPI slots in here later without touching components.

export interface Person {
  id: string
  name: string
  email: string
  title: string
  dept: string
  office: string
  tenure: string
  /** Direct manager id in the org tree; 'me' manages the direct reports. */
  managerId?: string
  status: 'online' | 'offline'
}

export const PEOPLE: Record<string, Person> = {
  me: {
    id: 'me',
    name: 'Ayan',
    email: 'ayan@emids.com',
    title: 'Senior Engineering Manager',
    dept: 'Data Engineering',
    office: 'Bengaluru',
    tenure: '6 yrs · joined Jul 2020',
    status: 'online',
  },
  p1: {
    id: 'p1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@emids.com',
    title: 'Data Engineer II',
    dept: 'Data Engineering',
    office: 'Bengaluru',
    tenure: '2 yrs',
    managerId: 'me',
    status: 'online',
  },
  p2: {
    id: 'p2',
    name: 'Daniel Cho',
    email: 'daniel.cho@emids.com',
    title: 'Principal Engineer',
    dept: 'Data Engineering',
    office: 'Tennessee',
    tenure: '7 yrs',
    managerId: 'me',
    status: 'offline',
  },
  p3: {
    id: 'p3',
    name: 'Priya Menon',
    email: 'priya.menon@emids.com',
    title: 'Analytics Lead',
    dept: 'Analytics',
    office: 'Noida',
    tenure: '4 yrs',
    managerId: 'me',
    status: 'online',
  },
  p4: {
    id: 'p4',
    name: 'Rohan Patel',
    email: 'rohan.patel@emids.com',
    title: 'Platform Engineer',
    dept: 'Data Engineering',
    office: 'Hyderabad',
    tenure: '1.5 yrs',
    managerId: 'me',
    status: 'online',
  },
  p5: {
    id: 'p5',
    name: 'Sofia Reyes',
    email: 'sofia.reyes@emids.com',
    title: 'QA Specialist',
    dept: 'Quality',
    office: 'Tennessee',
    tenure: '3 yrs',
    managerId: 'me',
    status: 'offline',
  },
  p6: {
    id: 'p6',
    name: 'Kenji Watanabe',
    email: 'kenji.watanabe@emids.com',
    title: 'Data Scientist',
    dept: 'Analytics',
    office: 'Bengaluru',
    tenure: '2 yrs',
    managerId: 'me',
    status: 'online',
  },
  p7: {
    id: 'p7',
    name: 'Emily Tran',
    email: 'emily.tran@emids.com',
    title: 'Product Designer',
    dept: 'Design',
    office: 'Tennessee',
    tenure: '5 yrs',
    managerId: 'vp',
    status: 'online',
  },
  p8: {
    id: 'p8',
    name: 'Vikram Rao',
    email: 'vikram.rao@emids.com',
    title: 'Delivery Director',
    dept: 'Delivery',
    office: 'Bengaluru',
    tenure: '8 yrs',
    managerId: 'vp',
    status: 'offline',
  },
  ceo: {
    id: 'ceo',
    name: 'Anand Desai',
    email: 'anand.desai@emids.com',
    title: 'Chief Executive Officer',
    dept: 'Executive',
    office: 'Tennessee',
    tenure: '10 yrs',
    status: 'offline',
  },
  vp: {
    id: 'vp',
    name: 'Kavita Nair',
    email: 'kavita.nair@emids.com',
    title: 'VP Engineering',
    dept: 'Data Engineering',
    office: 'Bengaluru',
    tenure: '9 yrs',
    managerId: 'ceo',
    status: 'online',
  },
  cto: {
    id: 'cto',
    name: 'Grace Liu',
    email: 'grace.liu@emids.com',
    title: 'Chief Technology Officer',
    dept: 'Executive',
    office: 'Tennessee',
    tenure: '7 yrs',
    managerId: 'ceo',
    status: 'online',
  },
  p9: {
    id: 'p9',
    name: 'Sanjay Kumar',
    email: 'sanjay.kumar@emids.com',
    title: 'Data Engineer I',
    dept: 'Data Engineering',
    office: 'Hyderabad',
    tenure: '10 mo',
    managerId: 'me',
    status: 'offline',
  },
  p10: {
    id: 'p10',
    name: 'Nia Thomas',
    email: 'nia.thomas@emids.com',
    title: 'Sr. Analyst',
    dept: 'Analytics',
    office: 'Noida',
    tenure: '3 yrs',
    managerId: 'me',
    status: 'online',
  },
  p11: {
    id: 'p11',
    name: 'David Park',
    email: 'david.park@emids.com',
    title: 'Cloud Architect',
    dept: 'Data Engineering',
    office: 'Tennessee',
    tenure: '5 yrs',
    managerId: 'vp',
    status: 'offline',
  },
  p12: {
    id: 'p12',
    name: 'Anjali Gupta',
    email: 'anjali.gupta@emids.com',
    title: 'EA, Engineering',
    dept: 'Operations',
    office: 'Bengaluru',
    tenure: '2 yrs',
    managerId: 'vp',
    status: 'online',
  },
  p13: {
    id: 'p13',
    name: 'Ishaan Verma',
    email: 'ishaan.verma@emids.com',
    title: 'Cloud Engineer II',
    dept: 'Data Engineering',
    office: 'Hyderabad',
    tenure: '1 yr',
    managerId: 'me',
    status: 'online',
  },
  p14: {
    id: 'p14',
    name: 'Grace Mathew',
    email: 'grace.mathew@emids.com',
    title: 'QA Lead',
    dept: 'Quality',
    office: 'Noida',
    tenure: '2 yrs',
    managerId: 'me',
    status: 'offline',
  },
}

export const person = (id: string): Person => PEOPLE[id] ?? PEOPLE.me

export const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export interface LeaderRow {
  id: string
  name: string
  pts: number
}

// Peer points received this quarter — EoQ prize payouts not included
export const TEAM_LEADERBOARD: LeaderRow[] = [
  { id: 'p2', pts: 420 },
  { id: 'me', pts: 380 },
  { id: 'p1', pts: 275 },
  { id: 'p3', pts: 250 },
  { id: 'p6', pts: 220 },
  { id: 'p10', pts: 190 },
  { id: 'p5', pts: 160 },
  { id: 'p4', pts: 90 },
  { id: 'p13', pts: 60 },
  { id: 'p14', pts: 45 },
  { id: 'p9', pts: 25 },
].map((r) => ({ ...r, name: person(r.id).name }))

/* ---------- Team slice (Recognition Tree + team stats) ---------- */

export type TeamId = 'humana' | 'dev'

export interface TeamMemberStat {
  id: string
  given: number
  received: number
  lastRecognized: string
  valuesTop: ValueKey
}

export const TEAMS: { id: TeamId; name: string }[] = [
  { id: 'humana', name: 'Humana' },
  { id: 'dev', name: 'PACCA AI' },
]

export const TEAM_STATS: Record<TeamId, TeamMemberStat[]> = {
  humana: [
    { id: 'p1', given: 14, received: 9, lastRecognized: 'Today', valuesTop: 'ownership' },
    { id: 'p3', given: 11, received: 12, lastRecognized: 'Yesterday', valuesTop: 'customerFirst' },
    { id: 'p10', given: 9, received: 8, lastRecognized: '2 d ago', valuesTop: 'collaboration' },
    { id: 'p5', given: 8, received: 10, lastRecognized: '3 d ago', valuesTop: 'winningMindset' },
    { id: 'p6', given: 6, received: 14, lastRecognized: 'Yesterday', valuesTop: 'customerFirst' },
    { id: 'p2', given: 7, received: 17, lastRecognized: 'Today', valuesTop: 'innovation' },
    { id: 'p9', given: 0, received: 2, lastRecognized: '— 21 days', valuesTop: 'collaboration' },
    { id: 'p4', given: 3, received: 4, lastRecognized: '— 16 days', valuesTop: 'ownership' },
  ],
  dev: [
    { id: 'p7', given: 10, received: 13, lastRecognized: 'Today', valuesTop: 'customerFirst' },
    { id: 'p11', given: 4, received: 9, lastRecognized: '3 d ago', valuesTop: 'ownership' },
    { id: 'p12', given: 2, received: 3, lastRecognized: '6 d ago', valuesTop: 'winningMindset' },
    { id: 'p13', given: 5, received: 6, lastRecognized: '2 d ago', valuesTop: 'innovation' },
    { id: 'p14', given: 7, received: 5, lastRecognized: '5 d ago', valuesTop: 'collaboration' },
  ],
}

export interface TreeNode {
  id: string
  children?: TreeNode[]
}

export const ORG_TREE: TreeNode = {
  id: 'ceo',
  children: [
    {
      id: 'cto',
      children: [
        {
          id: 'vp',
          children: [
            { id: 'p11' },
            { id: 'p12' },
            {
              id: 'me',
              children: [
                { id: 'p1' },
                { id: 'p2' },
                { id: 'p3' },
                { id: 'p4' },
                { id: 'p5' },
                { id: 'p6' },
                { id: 'p9' },
                { id: 'p10' },
                { id: 'p13' },
                { id: 'p14' },
              ],
            },
          ],
        },
      ],
    },
    { id: 'p8' },
  ],
}

export const ORG_STATS = { recognitions: 279 }

export const DASH_STATS = { given: 14, got: 9 }

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
    artUrl: '/xoxo/customer_first_01.jpg',
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
    artUrl: '/xoxo/collaboration_illu_01.jpg',
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
    artUrl: '/xoxo/winning_mindset_01.jpg',
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
    img: '/img2.jpg',
    title: 'EoQ window · Q4',
    headline: 'Nominations close in 19 days',
    blurb: '4 categories open · jury voting starts Nov 3',
    cta: 'Nominate now',
    cta2: 'See categories',
  },
  {
    key: 'awards',
    img: '/img1.png',
    title: 'Quarterly Awards',
    headline: 'Awards worth 7,500 pts this quarter',
    blurb: 'Nominate the teammate who shipped, saved, and showed up. The jury reads every word.',
    cta: 'Nominate someone',
  },
  {
    key: 'jury',
    img: '/img2.jpg',
    title: 'Jury Dashboard',
    headline: 'Your jury ballot is half-cast',
    blurb: 'Round 1 voting is underway — your ballot locks Nov 14, 5 PM IST.',
    cta: 'Cast your vote',
  },
]

/* ---------- Rewards slice ---------- */

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
    artUrl: '/xoxo/customer_first_01.jpg',
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

/** Values received this quarter — lives on the Rewards page card. */
export interface ValueLived {
  key: ValueKey
  count: number
}

export const VALUES_LIVED: ValueLived[] = [
  { key: 'customerFirst', count: 14 },
  { key: 'collaboration', count: 9 },
  { key: 'ownership', count: 7 },
  { key: 'innovation', count: 4 },
  { key: 'winningMindset', count: 2 },
]

/** My nominations in the EoQ jury pipeline — shown beside Values you live. */
export interface EoQAward {
  id: string
  category: string
  nominee: string
  status: 'result' | 'review'
  result?: string
}

export const MY_EOQ_AWARDS: EoQAward[] = [
  { id: 'aw1', category: 'Team Player', nominee: 'Emily Tran', status: 'result', result: 'Winner — announced Sep 30' },
  { id: 'aw2', category: 'Innovator', nominee: 'Kenji Watanabe', status: 'review' },
]

/* ---------- EMIDS values + recognition templates (port of the approved design) ---------- */

export type ValueKey = 'customerFirst' | 'innovation' | 'collaboration' | 'ownership' | 'winningMindset'

export interface CoreValue {
  label: string
  ink: string
  soft: string
  /** Solid hex used by the "Values you live" progress bars. */
  solid: string
}

export const CORE_VALUES: Record<ValueKey, CoreValue> = {
  customerFirst: { label: 'Customer First', ink: 'text-value-cf', soft: 'bg-value-cf-soft', solid: '#0fa3a3' },
  innovation: { label: 'Innovation', ink: 'text-value-in', soft: 'bg-value-in-soft', solid: '#ff8938' },
  collaboration: { label: 'Collaboration', ink: 'text-value-co', soft: 'bg-value-co-soft', solid: '#7a5af8' },
  ownership: { label: 'Ownership', ink: 'text-value-ow', soft: 'bg-value-ow-soft', solid: '#17b26a' },
  winningMindset: { label: 'Winning Mindset', ink: 'text-value-wm', soft: 'bg-value-wm-soft', solid: '#ff5a5f' },
}

export const VALUE_KEYS = Object.keys(CORE_VALUES) as ValueKey[]

export interface PraiseTemplate {
  id: string
  name: string
  emoji: string
  /** 6 banner variants (3 people-photo, 3 illustration) at 1100x314. */
  urls: string[]
  prefill: string
}

export const VALUE_TEMPLATES: Record<ValueKey, PraiseTemplate[]> = {
  customerFirst: [
    {
      id: 'cf-star',
      name: 'Service Star',
      emoji: '⭐',
      urls: [
        '/xoxo/customer_first_01.jpg',
        '/xoxo/customer_first_02.jpg',
        '/xoxo/customer_first_03.jpg',
        '/xoxo/customer_first_illu_01.jpg',
        '/xoxo/customer_first_illu_02.jpg',
        '/xoxo/customer_first_illu_03.jpg',
      ],
      prefill: 'Thank you for putting the client first this week — every request you took got a quick, clear reply.',
    },
  ],
  innovation: [
    {
      id: 'in-spark',
      name: 'Fresh Spark',
      emoji: '💡',
      urls: [
        '/xoxo/innovation_01.jpg',
        '/xoxo/innovation_02.jpg',
        '/xoxo/innovation_03.jpg',
        '/xoxo/innovation_illu_01.jpg',
        '/xoxo/innovation_illu_02.jpg',
        '/xoxo/innovation_illu_03.jpg',
      ],
      prefill: 'The simpler way you found is saving all of us real time now — great catch, and thank you.',
    },
  ],
  collaboration: [
    {
      id: 'co-team',
      name: 'One Team',
      emoji: '🤝',
      urls: [
        '/xoxo/collaboration_01.jpg',
        '/xoxo/collaboration_02.jpg',
        '/xoxo/collaboration_03.jpg',
        '/xoxo/collaboration_illu_01.jpg',
        '/xoxo/collaboration_illu_02.jpg',
        '/xoxo/collaboration_illu_03.jpg',
      ],
      prefill: 'Thanks for jumping in to help another team this week — we all noticed, and they did too.',
    },
  ],
  ownership: [
    {
      id: 'ow-done',
      name: 'Done & Done',
      emoji: '✅',
      urls: [
        '/xoxo/ownership_01.jpg',
        '/xoxo/ownership_02.jpg',
        '/xoxo/ownership_03.jpg',
        '/xoxo/ownership_illu_01.jpg',
        '/xoxo/ownership_illu_02.jpg',
        '/xoxo/ownership_illu_03.jpg',
      ],
      prefill: 'You took this end-to-end and closed it out — no follow-up needed, just results.',
    },
  ],
  winningMindset: [
    {
      id: 'wm-drive',
      name: 'Winning Drive',
      emoji: '🏆',
      urls: [
        '/xoxo/winning_mindset_01.jpg',
        '/xoxo/winning_mindset_02.jpg',
        '/xoxo/winning_mindset_03.jpg',
        '/xoxo/winning_mindset_illu_01.jpg',
        '/xoxo/winning_mindset_illu_02.jpg',
        '/xoxo/winning_mindset_illu_03.jpg',
      ],
      prefill: 'You brought the energy when it mattered most — momentum like that lifts the whole sprint.',
    },
  ],
}

/* ---------- Feed slice (recognition journey on profiles, home feed) ---------- */

export type ReactionKey = 'clap' | 'celebrate' | 'heart' | 'highfive' | 'insight'

export interface PostComment {
  id: string
  fromId: string
  text: string
  when: string
}

export interface Post {
  id: string
  kind: 'praise' | 'award' | 'milestone' | 'welcome'
  awardLabel?: string
  fromId: string
  toIds: string[]
  valueKey?: ValueKey
  tpl?: string
  message: string
  points?: number
  when: string
  comments: PostComment[]
  counts: Partial<Record<ReactionKey, number>>
}

export const POSTS: Post[] = [
  {
    id: 'q1',
    kind: 'praise',
    fromId: 'p2',
    toIds: ['p1'],
    valueKey: 'ownership',
    points: 50,
    when: '2 h ago',
    message:
      'Aarav jumped on the payer-claims pipeline outage at 6 AM, traced it to the schema drift in the eligibility feed, and shipped the fix before standup. The CVS account never noticed. That is what ownership looks like.',
    comments: [{ id: 'c1', fromId: 'p3', text: 'Legend. That feed is a nightmare on a good day.', when: '1 h ago' }],
    counts: { clap: 24, celebrate: 9, heart: 7, highfive: 4, insight: 2 },
  },
  {
    id: 'q2',
    kind: 'award',
    awardLabel: 'Innovator of Q3',
    fromId: 'vp',
    toIds: ['p2'],
    valueKey: 'innovation',
    points: 2000,
    when: 'Yesterday',
    message:
      'Daniel built the LLQ eval harness that halved our release validation time from 4 hours to 40 minutes. Jury vote was unanimous.',
    comments: [
      { id: 'c2', fromId: 'me', text: 'So deserved — the harness is a thing of beauty.', when: '20 h ago' },
      { id: 'c3', fromId: 'p10', text: 'Congrats Daniel! 🏆', when: '18 h ago' },
    ],
    counts: { celebrate: 41, clap: 18, heart: 12, highfive: 8, insight: 1 },
  },
  {
    id: 'q3',
    kind: 'praise',
    fromId: 'p5',
    toIds: ['p6'],
    valueKey: 'customerFirst',
    points: 25,
    when: 'Yesterday',
    message:
      "Kenji's anomaly report on readmission-risk drift gave the client team a week of head start on model revalidation. Made us look proactive instead of reactive.",
    comments: [],
    counts: { heart: 11, insight: 6, clap: 5, highfive: 2, celebrate: 0 },
  },
  {
    id: 'q4',
    kind: 'praise',
    fromId: 'me',
    toIds: ['p10'],
    valueKey: 'collaboration',
    when: '2 d ago',
    message:
      'Nia sat with the QA squad for two sprints and turned their tribal knowledge into runbooks the whole pod now uses. Cross-team glue never shows in velocity, but everyone feels it.',
    comments: [{ id: 'c4', fromId: 'p4', text: 'Those runbooks saved my week.', when: '1 d ago' }],
    counts: { clap: 16, heart: 9, highfive: 5, celebrate: 2, insight: 3 },
  },
  {
    id: 'q5',
    kind: 'milestone',
    fromId: 'vp',
    toIds: ['p8'],
    when: '3 d ago',
    message:
      'Vikram completes 8 years at emids. From a two-client portfolio to owning delivery for our largest strategic account — happy milestone, Vikram!',
    comments: [{ id: 'c5', fromId: 'p7', text: '8 years! The account legend himself.', when: '2 d ago' }],
    counts: { celebrate: 33, heart: 15, clap: 12, highfive: 9, insight: 0 },
  },
  {
    id: 'q6',
    kind: 'praise',
    fromId: 'p4',
    toIds: ['p5'],
    valueKey: 'winningMindset',
    points: 25,
    when: '4 d ago',
    message:
      'Sofia caught the race condition in the eligibility batch just before the release freeze window and wrote the repro test so it never slips through again.',
    comments: [],
    counts: { clap: 14, heart: 6, highfive: 4, celebrate: 1, insight: 1 },
  },
  {
    id: 'q7',
    kind: 'welcome',
    fromId: 'me',
    toIds: ['p9'],
    when: '1 w ago',
    message:
      'Please join me in welcoming Sanjay to the Data pod! He has already picked up the census pipeline and his first PR review was sharp. Give him a follow and say hello.',
    comments: [],
    counts: { heart: 10, celebrate: 8, clap: 7, highfive: 3, insight: 0 },
  },
  {
    id: 'q8',
    kind: 'praise',
    fromId: 'p12',
    toIds: ['p11'],
    valueKey: 'ownership',
    points: 25,
    when: '1 w ago',
    message:
      'David reworked the environment onboarding so a new joiner gets a working stack in one day instead of one week. Onboarding NPS went from 31 to 78.',
    comments: [],
    counts: { clap: 21, insight: 8, heart: 4, celebrate: 2, highfive: 2 },
  },
]

/* ---------- Notifications slice ---------- */

export interface NotificationItem {
  id: string
  group: 'praise' | 'approval' | 'window' | 'milestone'
  title: string
  sub: string
  when: string
  unread: boolean
  go?: 'team' | 'awards' | 'home'
}

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'nt1',
    group: 'approval',
    title: 'Approval pending — Rohan → Sofia +100 pts',
    sub: 'Needs budget confirmation',
    when: '3 h ago',
    unread: true,
    go: 'team',
  },
  {
    id: 'nt2',
    group: 'approval',
    title: 'Nomination endorsement — Nia Thomas',
    sub: 'Jury review next',
    when: '6 h ago',
    unread: true,
    go: 'team',
  },
  {
    id: 'nt3',
    group: 'praise',
    title: 'Daniel Cho praised your runbook work',
    sub: '+ Team Player react by 9 others',
    when: '1 d ago',
    unread: true,
    go: 'home',
  },
  {
    id: 'nt4',
    group: 'window',
    title: 'EoQ nominations close Oct 31',
    sub: '4 categories are open',
    when: '2 d ago',
    unread: false,
    go: 'awards',
  },
  {
    id: 'nt5',
    group: 'milestone',
    title: "Vikram's 8-year anniversary today",
    sub: 'Say Congrats on the feed',
    when: '3 d ago',
    unread: false,
    go: 'home',
  },
  {
    id: 'nt6',
    group: 'praise',
    title: 'You appeared in 3 recognitions this week',
    sub: 'Weekly digest',
    when: '4 d ago',
    unread: false,
    go: 'home',
  },
]
