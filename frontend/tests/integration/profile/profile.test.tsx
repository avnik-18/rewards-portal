import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from '@/profile/page'

function renderProfile(id?: string) {
  return render(
    <MemoryRouter initialEntries={[id ? `/profile?id=${id}` : '/profile']}>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage — ditto of the old profile screen', () => {
  it('renders the member header, points stats and the Recognize action', async () => {
    renderProfile('p1')
    await screen.findByRole('heading', { name: /Aarav Sharma/ })

    expect(screen.getByRole('heading', { name: /Aarav Sharma/ })).toBeTruthy()
    expect(screen.getByText('Reports to Ayan')).toBeTruthy()
    expect(screen.getByText('Points earned')).toBeTruthy()
    expect(screen.getByText('Received')).toBeTruthy()
    expect(screen.getByText('Given')).toBeTruthy()
    const link = screen.getByRole('link', { name: /Recognize/ })
    expect(link.getAttribute('href')).toBe('/recognize?to=p1')
  })

  it('the journey switches between Received and Given with counts', async () => {
    renderProfile('p1')
    await screen.findByRole('heading', { name: /Aarav Sharma/ })

    // q1 praises Aarav; he gave nothing — the empty state speaks for it
    fireEvent.click(await screen.findByText(/Given 0/))
    expect(screen.getByText('Nothing here yet')).toBeTruthy()
    fireEvent.click(await screen.findByText(/Received 1/))
    expect(screen.getByText('Daniel Cho')).toBeTruthy() // the praised-you card shows the giver
    expect(screen.getByText('Tenure timeline')).toBeTruthy()
  })

  it('the signed-in profile shows the You chip instead of Recognize', async () => {
    renderProfile('me')
    expect(await screen.findByText('You')).toBeTruthy()

    expect(screen.queryByRole('link', { name: /Recognize/ })).toBeNull()
    // points earned adds the wallet bonus only on me
    expect(screen.getByText('1,240')).toBeTruthy() // 0 received-points + wallet
  })

  it("an unknown id renders the not-found card, never another person's profile", async () => {
    renderProfile('ghost-id')

    expect(await screen.findByText(/This page doesn't exist/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Aarav Sharma/ })).toBeNull()
  })
})
