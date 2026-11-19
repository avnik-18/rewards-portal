import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'

const APPLAUSE_KEY = 'applause-demo-user'

describe('demo sign-in flow', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('a fresh session is gated at the login screen', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    // the route announcer repeats the label — scope to the page heading
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue with Emids SSO' })).toBeTruthy()
    // dashboard never rendered behind it
    expect(screen.queryByText(/Hello/)).toBeNull()
  })

  it('the SSO button explains the rollout instead of doing nothing', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Emids SSO' }))
    expect(within(screen.getByRole('main')).getByRole('status').textContent).toMatch(
      /Entra SSO lands with the production rollout/,
    )
  })

  it('picking a person signs in as them and lands on their dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Select a person')).toBeTruthy()

    // the directory feed carries name + designation (backend GET /auth/demo-users)
    fireEvent.change(screen.getByLabelText('Sign in as'), { target: { value: 'E-BR' } })

    expect(await screen.findByText(/Hello/)).toBeTruthy()
    expect(window.localStorage.getItem(APPLAUSE_KEY)).toBe('E-BR')
  })

  it('the header menu shows the signed-in person with their designation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText('Select a person')
    fireEvent.change(screen.getByLabelText('Sign in as'), { target: { value: 'E-PR' } })
    await screen.findByText(/Hello/)

    fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }))
    // scope to the disclosure panel — the hero greeting shows the same name
    const link = screen.getByRole('link', { name: /My profile/ })
    const disclosure = link.parentElement as HTMLElement
    expect(await within(disclosure).findByText('Priya Rao')).toBeTruthy() // GET /me via the stubbed actor
    expect(within(disclosure).getByText('Engineer')).toBeTruthy()
  })
})
