import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'

describe('App shell (routing + layout)', () => {
  it('mounts the dashboard inside the shell with nav and footer', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Hello/)).toBeTruthy()
    // shell chrome: brand link, primary nav, footer policy links, mobile bars
    expect(screen.getAllByRole('link', { name: /Go to dashboard/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /Privacy Policy/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Rewards' })).toBeTruthy() // mobile bottom bar
  })

  it('navigates to the team screen from the primary nav', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText(/Hello/)

    fireEvent.click(screen.getAllByRole('link', { name: /My Team/ })[0])
    expect(await screen.findByRole('button', { name: /My team info/i })).toBeTruthy()
  })

  it('renders the not-found screen for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/nope']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/This page doesn't exist/)).toBeTruthy()
    // the brand link and the not-found CTA both lead home
    expect(screen.getAllByRole('link', { name: /Go to dashboard/ }).length).toBeGreaterThan(0)
  })
})
