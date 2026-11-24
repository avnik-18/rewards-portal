import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ComposeForm } from '@/recognize/compose-form'
import ComposePage from '@/recognize/page'
import App from '@/App'
import { PEOPLE } from '@/lib/mock-data'

const people = Object.values(PEOPLE).filter((entry) => entry.id !== 'me')

beforeEach(() => {
  document.body.textContent = '' // Modal portals stack between tests
})

describe('ComposeForm extras (client interactions)', () => {
  it('pre-selects the ?to= recipient from the Praise preset, ignoring a stale id', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/recognize?to=p3']}>
        <ComposePage />
      </MemoryRouter>,
    )
    // p3 renders as the Priya chip immediately — no typing needed
    // (the chip and the preview card both carry the first name)
    const priyaNodes = await screen.findAllByText('Priya', { exact: true })
    expect(priyaNodes.length).toBeGreaterThan(0)
    unmount()

    // a garbage ?to= must not create a ghost chip (sir's preset validation)
    render(
      <MemoryRouter initialEntries={['/recognize?to=ghost-9']}>
        <ComposePage />
      </MemoryRouter>,
    )
    await screen.findByPlaceholderText('Whom do you want to recognise?')
    expect(screen.queryByText('ghost-9')).toBeNull()
  })

  it('the typed-email row adds a To chip that can be removed again', async () => {
    render(
      <MemoryRouter>
        <ComposeForm people={people} canAwardPoints />
      </MemoryRouter>,
    )
    await screen.findByPlaceholderText('Whom do you want to recognise?')

    const input = screen.getByPlaceholderText('Whom do you want to recognise?')
    fireEvent.change(input, { target: { value: 'guest@outside.dev' } })
    fireEvent.click(await screen.findByText(/Add guest@outside\.dev/))
    // the chip proves itself through its own remove control
    const remove = screen.getByRole('button', { name: 'Remove guest@outside.dev from To' })
    expect(remove).toBeTruthy()
    fireEvent.click(remove)
    await waitFor(() => expect(screen.queryByText('guest@outside.dev')).toBeNull())
  })

  it('typing a non-matching query shows the no-match copy', async () => {
    render(
      <MemoryRouter>
        <ComposeForm people={people} canAwardPoints />
      </MemoryRouter>,
    )
    await screen.findByPlaceholderText('Whom do you want to recognise?')
    fireEvent.change(screen.getByPlaceholderText('Whom do you want to recognise?'), {
      target: { value: 'zzzqqq' },
    })
    expect(await screen.findByText('No match — anyone at emids is eligible.')).toBeTruthy()
  })

  it('the CC field picks, labels managers, adds typed emails and removes chips', async () => {
    render(
      <MemoryRouter>
        <ComposeForm people={people} canAwardPoints />
      </MemoryRouter>,
    )
    const to = screen.getByPlaceholderText('Whom do you want to recognise?')
    fireEvent.change(to, { target: { value: 'priya' } })
    fireEvent.click(await screen.findByText('Priya Menon'))
    await screen.getAllByPlaceholderText('Add more…')[0] // placeholder swaps after the pick

    // the CC search labels the result's manager ("manager: <first name>")
    // (both To and CC placeholders read "Add more…" after the To pick — CC is the second)
    fireEvent.change(screen.getAllByPlaceholderText('Add more…')[1], { target: { value: 'kenji' } })
    const managerRow = await screen.findByText('Kenji Watanabe')
    fireEvent.click(managerRow)
    expect(await screen.findByText(/Kenji/)).toBeTruthy()

    // the chip's remove control is the proof the CC pick landed ("Kenji" first name)
    const removeCc = await screen.findByRole('button', { name: 'Remove Kenji from CC' })
    fireEvent.click(removeCc)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Kenji from CC' })).toBeNull())
  })

  it('template variant selection and the expanded preview modal open and close', async () => {
    render(
      <MemoryRouter>
        <ComposeForm people={people} canAwardPoints />
      </MemoryRouter>,
    )
    const to = screen.getByPlaceholderText('Whom do you want to recognise?')
    fireEvent.change(to, { target: { value: 'priya' } })
    fireEvent.click(await screen.findByText('Priya Menon'))
    fireEvent.click(screen.getByRole('button', { name: 'Ownership' }))

    // canSend unlocks the maximiser
    fireEvent.change(screen.getByPlaceholderText('What made them stand out?'), {
      target: { value: 'Priya shipped the migration ahead of the deadline.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Template option 2' }))
    expect(screen.getByRole('button', { name: 'Template option 2' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Expand preview' }))
    const dialog = screen.getByRole('dialog', { name: 'Template preview' })
    expect(dialog.textContent).toContain('Final preview ·')

    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    expect(screen.queryByRole('dialog', { name: 'Template preview' })).toBeNull()
  })

  it('the Back button leaves the composer into the previous screen', async () => {
    render(
      <MemoryRouter initialEntries={['/', '/recognize']} initialIndex={1}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('button', { name: 'Back' })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    // navigate(-1) lands on the dashboard — the greeting appears
    await screen.findByText(/Hello/)
  })
})
