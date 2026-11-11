import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ComposeHeading from '@/recognize/compose-heading'
import { ROTATE_WORDS } from '@/lib/compose'

const renderHeading = () =>
  render(
    <MemoryRouter>
      <ComposeHeading />
    </MemoryRouter>,
  )

describe('ComposeHeading — rotation vs reduced motion (sir round 1)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rotates to the next word on its timer when motion is allowed', () => {
    vi.useFakeTimers()
    renderHeading()
    expect(screen.getByText(ROTATE_WORDS[0], { selector: '.word-roll-cycle' })).toBeTruthy()

    act(() => { vi.advanceTimersByTime(2600) })
    expect(screen.getByText(ROTATE_WORDS[1], { selector: '.word-roll-cycle' })).toBeTruthy()
  })

  it('stays on the first word under prefers-reduced-motion — no timer is even set', () => {
    vi.useFakeTimers()
    const originalStub = window.matchMedia
    window.matchMedia = (media: string) => ({
      matches: true,
      media,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })

    try {
      renderHeading()
      expect(screen.getByText(ROTATE_WORDS[0], { selector: '.word-roll-cycle' })).toBeTruthy()
      act(() => { vi.advanceTimersByTime(10_000) })
      expect(screen.getByText(ROTATE_WORDS[0], { selector: '.word-roll-cycle' })).toBeTruthy()
    } finally {
      window.matchMedia = originalStub
    }
  })
})
