import { person, initials } from "./people"
import type { ValueKey } from "./values"
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
