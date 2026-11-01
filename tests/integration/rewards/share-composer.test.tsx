import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareComposer from '@/components/organisms/ShareComposer'

const props = {
  recognitionId: 'rc1',
  receiverName: 'Ayan',
  giverNames: 'Daniel Cho',
  valueLabel: 'Ownership',
  message: 'Cleanest handoff doc I have seen on this team.',
  onClose: vi.fn(),
}

describe('ShareComposer (organism — in-app step 1 of the LinkedIn share)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens with an EMPTY text box (user writes their own words) and card options', async () => {
    render(<ShareComposer {...props} />)
    const text = (await screen.findByPlaceholderText('Write or edit your LinkedIn post…')) as HTMLTextAreaElement
    expect(text.value).toBe('') // their own words, never an auto-draft pasted over them
    expect(screen.getByRole('button', { name: /Use suggested draft/i })).toBeTruthy()
    expect(document.querySelectorAll('button[aria-label^="Card image option"]').length).toBe(6)
  })

  it('suggested draft fills only when clicked (never overwrites your own words)', async () => {
    render(<ShareComposer {...props} />)
    fireEvent.click(await screen.findByRole('button', { name: /Use suggested draft/i }))
    const text = (await screen.findByPlaceholderText('Write or edit your LinkedIn post…')) as HTMLTextAreaElement
    expect(text.value).toContain('Recognized by Daniel Cho')
  })

  it('Post copies ONLY the user-typed words, never the auto draft', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    ;(navigator as unknown as { clipboard: unknown }).clipboard = { writeText }
    render(<ShareComposer {...props} />)

    fireEvent.click(await screen.findByRole('button', { name: /^Post$/i }))
    expect(writeText).not.toHaveBeenCalled() // no text → no clipboard, and never the auto-draft

    fireEvent.change(await screen.findByPlaceholderText('Write or edit your LinkedIn post…'), {
      target: { value: 'These are MY OWN LinkedIn words.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Post$/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('These are MY OWN LinkedIn words.'))
  })

  it('AI Polish works only once real text exists', async () => {
    render(<ShareComposer {...props} />)
    const text = (await screen.findByPlaceholderText('Write or edit your LinkedIn post…')) as HTMLTextAreaElement

    const polish = (await screen.findByRole('button', { name: /AI Polish/i })) as HTMLButtonElement
    expect(polish.disabled).toBe(true) // empty text — nothing to polish

    fireEvent.change(text, { target: { value: 'My own.LinkedIn post words.' } })
    expect(((await screen.findByRole('button', { name: /AI Polish/i })) as HTMLButtonElement).disabled).toBe(false)
  })

  it('Close triggers the dismiss callback', async () => {
    render(<ShareComposer {...props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Close share' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
