import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProfilePage, { type ProfilePageProps } from '@/app/profile/page'

async function renderProfile(id?: string) {
  const searchParams = Promise.resolve<{ id?: string }>({}) as ProfilePageProps['searchParams']
  const Page = await ProfilePage({
    searchParams: id ? (Promise.resolve({ id }) as unknown as ProfilePageProps['searchParams']) : searchParams,
  })
  return render(Page as never)
}

describe('ProfilePage — ditto of the old profile screen', () => {
  it('renders the member header, points stats and the Recognize action', async () => {
    await renderProfile('p1')

    expect(screen.getByRole('heading', { name: /Aarav Sharma/ })).toBeTruthy()
    expect(screen.getByText('Reports to Ayan')).toBeTruthy()
    expect(screen.getByText('Points earned')).toBeTruthy()
    expect(screen.getByText('Received')).toBeTruthy()
    expect(screen.getByText('Given')).toBeTruthy()
    const link = screen.getByRole('link', { name: /Recognize/ })
    expect(link.getAttribute('href')).toBe('/recognize?to=p1')
  })

  it('the journey switches between Received and Given with counts', async () => {
    await renderProfile('p1')

    // q1 praises Aarav; he gave nothing — the empty state speaks for it
    fireEvent.click(await screen.findByText(/Given 0/))
    expect(screen.getByText('Nothing here yet')).toBeTruthy()
    fireEvent.click(await screen.findByText(/Received 1/))
    expect(screen.getByText('Daniel Cho')).toBeTruthy() // the praised-you card shows the giver
    expect(screen.getByText('Tenure timeline')).toBeTruthy()
  })

  it('the signed-in profile shows the You chip instead of Recognize', async () => {
    await renderProfile('me')

    expect(screen.getByText('You')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Recognize/ })).toBeNull()
    // points earned adds the wallet bonus only on me
    expect(screen.getByText('1,240')).toBeTruthy() // 0 received-points + wallet
  })
})
