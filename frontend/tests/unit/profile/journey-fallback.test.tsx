import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProfileJourney from '@/components/organisms/ProfileJourney'
import type { Post } from '@/lib/data-api'

const ghostPost: Post = {
  id: 'q9',
  fromId: 'gone-person',
  toIds: ['me'],
  when: '3 days ago',
  message: 'A recognitions row whose giver no longer exists in the directory.',
} as unknown as Post

describe('ProfileJourney — known-data fallback', () => {
  it('a received post with a missing person renders the quiet placeholder, never raw ids', () => {
    render(<ProfileJourney received={[ghostPost]} given={[]} />)

    fireEvent.click(screen.getByText(/Received 1/))
    expect(screen.getByText(/A received recognition.*could not be linked/)).toBeTruthy()
  })

  it('the given tab carries its own placeholder wording', () => {
    const out: Post = { ...ghostPost, toIds: ['someone-else'], fromId: 'me' } as Post
    render(<ProfileJourney received={[]} given={[out]} />)

    fireEvent.click(screen.getByText(/Given 1/))
    expect(screen.getByText(/A recognition you gave.*could not be linked/)).toBeTruthy()
  })
})
