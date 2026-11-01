import { describe, it, expect } from 'vitest'
import { POSTS, PEOPLE } from '@/lib/mock-data'
import { getProfile } from '@/lib/data-api'

describe('profile data', () => {
  it('every post author and recipient resolves to a directory person', () => {
    for (const post of POSTS) {
      expect(PEOPLE[post.fromId]).toBeTruthy()
      for (const id of post.toIds) expect(PEOPLE[id]).toBeTruthy()
    }
  })

  it('getProfile splits received vs given and names the manager', async () => {
    const p = await getProfile('p1')
    expect(p.name).toBe('Aarav Sharma')
    expect(p.received).toHaveLength(1) // q1 is addressed to p1
    expect(p.given).toHaveLength(0) // p1 gave none in the seed feed
    expect(p.managerName).toBe('Ayan')
    expect(p.office).toBe('Bengaluru')
  })

  it('profiles without a manager report none', async () => {
    const ceo = await getProfile('ceo')
    expect(ceo.managerName).toBeNull()
  })
})
