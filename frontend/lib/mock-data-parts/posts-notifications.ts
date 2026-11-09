import type { ValueKey } from './values'
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
