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

  it('returns null for unknown ids so pages can 404 (never another profile)', async () => {
    expect(await getProfile('the-ghost-id')).toBeNull()
  })

  it('getProfile splits received vs given and names the manager', async () => {
    const profile = (await getProfile('p1'))!
    expect(profile.name).toBe('Aarav Sharma')
    expect(profile.received).toHaveLength(1) // q1 is addressed to p1
    expect(profile.given).toHaveLength(0) // p1 gave none in the seed feed
    expect(profile.managerName).toBe('Ayan')
    expect(profile.office).toBe('Bengaluru')
  })

  it('profiles without a manager report none', async () => {
    const ceo = (await getProfile('ceo'))!
    expect(ceo.managerName).toBeNull()
  })
})
