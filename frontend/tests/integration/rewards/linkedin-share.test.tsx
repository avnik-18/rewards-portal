import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import RecognitionsReceived from '@/components/organisms/recognitions-received'
import LinkedInShareButton from '@/components/molecules/LinkedInShareButton'
import { recognitionPageUrl } from '@/lib/linkedin'
import { RECEIVED } from '@/lib/mock-data'

const REAL_BASE = process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL

afterAll(() => {
  process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = REAL_BASE
})

const TIP = 'Share this recognition on LinkedIn.'

describe('LinkedInShareButton inside RecognitionsReceived', () => {
  let openSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    openSpy.mockRestore()
    process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = 'https://recognition.company.com'
  })

  it('appears only on shareable records (the private rc3 has no button)', () => {
    const { getAllByRole } = render(<RecognitionsReceived items={RECEIVED} />)
    const buttons = getAllByRole('button', { name: TIP })
    // collapsed rows: only the plain non-template rc2 shows its Share button;
    // the template rc1 expands on click (Share lives inside), rc3 is private
    expect(buttons).toHaveLength(1)
  })

  it('opens the in-app share composer (LinkedIn opens only when the user is ready)', () => {
    render(<RecognitionsReceived items={[RECEIVED[0]]} />)

    // template rows are collapsed — expand first, then press Share inside
    fireEvent.click(screen.getByRole('button', { name: /Daniel Cho/ }))
    fireEvent.click(screen.getByRole('button', { name: TIP }))

    // step 1 is in-app: card options, editable post text, LinkedIn opens separately
    expect(screen.getByText('Share this recognition')).toBeTruthy()
    expect(openSpy).not.toHaveBeenCalled() // LinkedIn never opens itself
  })

  it('shows the helper text as tooltip via title attribute', () => {
    render(<LinkedInShareButton recognitionId="rc1" />)
    const el = screen.getByRole('button', { name: TIP })
    // getByRole already proves the aria-label resolves; title drives the hover tooltip
    expect(el.getAttribute('title')).toBe(TIP)
    expect((el as HTMLButtonElement).type).toBe('button')
    expect((el as HTMLButtonElement).tabIndex).not.toBe(-1)
  })

  it('shows a friendly message and opens nothing when the config is broken', () => {
    process.env.NEXT_PUBLIC_RECOGNITION_BASE_URL = 'not a url'
    // the plain button (no context) drops straight to the LinkedIn tab — the broken config falls back politely
    render(<LinkedInShareButton recognitionId="rc1" />)

    fireEvent.click(screen.getByRole('button', { name: TIP }))

    expect(openSpy).not.toHaveBeenCalled()
    expect(screen.getByText(/Couldn’t open LinkedIn just now\./)).toBeTruthy()
  })
})
