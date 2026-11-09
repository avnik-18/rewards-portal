import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ComposeForm } from '@/recognize/compose-form'
import { PEOPLE } from '@/lib/mock-data'
import { AI_DRAFTS } from '@/lib/compose'

const people = Object.values(PEOPLE).filter((entry) => entry.id !== 'me')

/** fills a recipient first; fake timers must not be active yet because the
 *  page-data hook resolves through RTL's waitFor machinery. */
async function withRecipient() {
  const view = render(
    <MemoryRouter>
      <ComposeForm people={people} />
    </MemoryRouter>,
  )
  fireEvent.change(await screen.findByPlaceholderText('Whom do you want to recognise?'), { target: { value: 'priya' } })
  fireEvent.click(await screen.findByText('Priya Menon'))
  return view
}

describe('MessageField AI buttons (UI level)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Draft for me fills the note with the value draft and shows Thinking… while busy', async () => {
    const view = await withRecipient()
    vi.useFakeTimers()

    fireEvent.click(screen.getByRole('button', { name: /Draft for me/ }))
    expect(screen.getByRole('button', { name: /Thinking…/ })).toBeTruthy()
    expect((screen.getByPlaceholderText('What made them stand out?') as HTMLTextAreaElement).value).toContain(
      AI_DRAFTS['ownership'],
    )

    await act(async () => {
      vi.advanceTimersByTime(900)
    })
    expect(screen.getByRole('button', { name: /Draft for me/ })).toBeTruthy()
    view.unmount()
  })

  it('Polish appends the closing sentence to a real note', async () => {
    const view = await withRecipient()
    const note = screen.getByPlaceholderText('What made them stand out?') as HTMLTextAreaElement
    fireEvent.change(note, { target: { value: 'Priya shipped the migration ahead of the deadline.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Polish' }))

    await waitFor(() => expect(note.value).toContain('made a real difference'))
    expect(note.value).toContain('Priya shipped the migration')
    view.unmount()
  })
})

describe('ComposeHeading rotation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('the animated word rolls to the next ROTATE_WORDS entry on its timer', async () => {
    // fake timers must run from before the mount so the 2.6s interval is theirs
    vi.useFakeTimers()
    const view = render(
      <MemoryRouter>
        <ComposeForm people={people} />
      </MemoryRouter>,
    )
    // flush the page-data effect (promise microtasks, no timer work)
    await act(async () => {})

    fireEvent.change(screen.getByPlaceholderText('Whom do you want to recognise?'), { target: { value: 'priya' } })
    fireEvent.click(screen.getAllByText('Priya Menon')[0])

    expect(screen.getByText('teammate', { exact: true })).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(2700)
    })
    expect(screen.getByText('colleague', { exact: true })).toBeTruthy()
    view.unmount()
  })
})
