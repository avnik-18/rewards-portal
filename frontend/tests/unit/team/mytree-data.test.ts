import { describe, it, expect } from 'vitest'
import { TEAM_LEADERBOARD, TEAM_STATS, ORG_TREE, PEOPLE, type TreeNode } from '@/lib/mock-data'
import { getRecognitionTree } from '@/lib/data-api'

const flatTreeIds = (n: TreeNode, acc = new Set<string>()): Set<string> => {
  acc.add(n.id)
  for (const c of n.children ?? []) flatTreeIds(c, acc)
  return acc
}

describe('recognition tree data', () => {
  it('every node of the org tree resolves to a real person', () => {
    const ids = flatTreeIds(ORG_TREE)
    const people = Object.keys(PEOPLE)
    for (const id of ids) {
      expect(people).toContain(id)
    }
  })

  it('every directory id records itself (no stale keys)', () => {
    for (const [id, record] of Object.entries(PEOPLE)) expect(record.id).toBe(id)
  })

  it('the leaderboard is sorted descending by points', () => {
    const pts = TEAM_LEADERBOARD.map((row) => row.pts)
    expect([...pts].sort((a, b) => b - a)).toEqual(pts)
  })

  it('every leaderboard row resolves to a person and a name', () => {
    for (const row of TEAM_LEADERBOARD) {
      expect(PEOPLE[row.id]).toBeTruthy()
      expect(row.name).toBe(PEOPLE[row.id].name)
    }
  })

  it('getRecognitionTree returns the reports subtree with leaderboard pts and team names', async () => {
    const tree = await getRecognitionTree()
    expect(tree.me).toEqual({ name: 'Ayan', pts: 380 })
    expect(tree.members).toHaveLength(10)
    const ptsOf = (id: string) => TEAM_LEADERBOARD.find((row) => row.id === id)?.pts ?? NaN
    for (const member of tree.members) {
      expect(member.pts).toBe(ptsOf(member.id))
      const humana = TEAM_STATS.humana.some((stat) => stat.id === member.id)
      expect(member.teamId).toBe(humana ? 'humana' : 'dev')
      expect(member.teamName.length).toBeGreaterThan(0)
      expect(PEOPLE[member.id].name).toBe(member.name)
    }
  })
})
