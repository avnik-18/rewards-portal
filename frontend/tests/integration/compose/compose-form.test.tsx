import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ComposeForm } from '@/recognize/compose-form'
import { PEOPLE } from '@/lib/mock-data'

const people = Object.values(PEOPLE).filter((person) => person.id !== 'me')

/** ComposeForm's Back button navigates through React Router memory routing. */
function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

async function fillValidForm() {
  fireEvent.change(screen.getByPlaceholderText('Whom do you want to recognise?'), { target: { value: 'priya' } })
  fireEvent.click(await screen.findByText('Priya Menon'))
  fireEvent.click(screen.getByRole('button', { name: 'Ownership' }))
  fireEvent.change(screen.getByPlaceholderText('What made them stand out?'), {
    target: { value: 'Priya shipped the migration ahead of the deadline.' },
  })
  fireEvent.click(screen.getByRole('button', { name: '+25' }))
}

describe('ComposeForm (integration)', () => {
  it('keeps the send button disabled until To + value ≥ required note are present', () => {
    renderWithRouter(<ComposeForm people={people} />)

    const send = screen.getByRole('button', { name: /Post it/i }) as HTMLButtonElement
    expect(send.disabled).toBe(true)
    // no error copy is shown yet — the old designer used a disabled primary, not inline errors
    expect(screen.getByPlaceholderText('Whom do you want to recognise?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Customer First' })).toBeTruthy()
  })

  it('sends a recognition after To + value + note + points, using the parity flow', async () => {
    renderWithRouter(<ComposeForm people={people} />)
    await fillValidForm()

    const send = screen.getByRole('button', { name: /Post it/i }) as HTMLButtonElement
    expect(send.disabled).toBe(false)
    fireEvent.click(send)

    // the success strip renders several nodes — match on a substring
    await waitFor(() => expect(screen.getByText(/Recognition sent to Priya!/)).toBeTruthy())
    expect(screen.getAllByText('+25 pts').length).toBeGreaterThan(0)
  })

  it('flags a too-short note that still unlocks the button', async () => {
    renderWithRouter(<ComposeForm people={people} />)

    fireEvent.change(screen.getByPlaceholderText('Whom do you want to recognise?'), { target: { value: 'priya' } })
    fireEvent.click(await screen.findByText('Priya Menon'))
    fireEvent.click(screen.getByRole('button', { name: 'Ownership' }))
    fireEvent.change(screen.getByPlaceholderText('What made them stand out?'), { target: { value: 'abcdefghi' } })

    fireEvent.click(screen.getByRole('button', { name: /Post it/i }))
    expect(await screen.findByText('Tell us what they did — at least 10 characters.')).toBeTruthy()
  })

  it('prefills the note with the value prefill when a value chip is chosen after picking a recipient', async () => {
    renderWithRouter(<ComposeForm people={people} />)

    fireEvent.change(screen.getByPlaceholderText('Whom do you want to recognise?'), { target: { value: 'priya' } })
    fireEvent.click(await screen.findByText('Priya Menon'))
    fireEvent.click(screen.getByRole('button', { name: 'Innovation' }))

    const note = screen.getByPlaceholderText('What made them stand out?') as HTMLTextAreaElement
    expect(note.value).toContain('Priya')
    expect(note.value).toContain('The simpler way you found is saving all of us real time now')
  })

  it('shows CC picker results and adds a chip', async () => {
    renderWithRouter(<ComposeForm people={people} />)

    fireEvent.change(screen.getByPlaceholderText('Anyone else who should hear about this?'), {
      target: { value: 'kenji' },
    })
    expect(await screen.findByText('Kenji Watanabe')).toBeTruthy()
    fireEvent.click(screen.getByText('Kenji Watanabe'))

    // chip appears in the cc row; input placeholder swaps to "Add more…"
    expect(screen.getAllByText(/Kenji/).length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Add more…')).toBeTruthy()
  })
})
