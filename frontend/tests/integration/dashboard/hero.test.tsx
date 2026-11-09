import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from '@/components/organisms/Hero'

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero name="Ayan" />
    </MemoryRouter>,
  )
}

describe('Hero (integration)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('greets the logged-in person and offers the recognize action', () => {
    vi.useFakeTimers()
    renderHero()

    // the visible cycle text is styled uppercase by CSS — assert the accessible name
    expect(screen.getByText(/Hello Ayan/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Recognize a teammate' }).getAttribute('href')).toBe('/recognize')
  })

  it('rotates to the second headline after 4.2s', async () => {
    vi.useFakeTimers()
    renderHero()

    expect(screen.getByText(/celebrate the progress./)).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(4300)
    })
    expect(screen.getByText(/someone had a great week./)).toBeTruthy()
  })

  it('rotates the recognize button phrasing on its own timer', async () => {
    vi.useFakeTimers()
    renderHero()

    expect(screen.getByRole('link', { name: 'Recognize a teammate' })).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(3300)
    })
    // the cycle text changes inside the link; the aria-label stays stable on purpose
    expect(screen.getByText('Say Thanks')).toBeTruthy()
  })

  it('falls back to the poster image when the hero video fails', async () => {
    vi.useFakeTimers()
    renderHero()

    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    await act(async () => {
      fireEvent.error(video!)
    })
    expect(document.querySelector('img[src*="emids-hero.webp"]')).toBeTruthy()
    expect(document.querySelector('video')).toBeNull()
  })

  it('never mounts the video at all for prefers-reduced-motion users', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: true,
    })) as typeof window.matchMedia
    try {
      renderHero()
      // poster first paint, no autoplaying motion
      expect(document.querySelector('img[src*="emids-hero.webp"]')).toBeTruthy()
      expect(document.querySelector('video')).toBeNull()
    } finally {
      window.matchMedia = original
    }
  })

  it('the keyboard-operable pause control toggles the background video', async () => {
    vi.useFakeTimers()
    // a jsdom video never fires play/pause events — the controls rely on them
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play', { bubbles: true }))
      return Promise.resolve()
    })
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event('pause', { bubbles: true }))
    })
    const { getByRole } = renderHero()

    await act(async () => {
      vi.advanceTimersByTime(0)
    })
    const pauseBtn = getByRole('button', { name: 'Pause background video' })
    expect(pauseBtn.getAttribute('aria-pressed')).toBe('false')
    // in a real browser autoplay leaves the video playing; jsdom's autoplay
    // never runs, so flip the element property to match
    const video = document.querySelector('video') as HTMLVideoElement
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    fireEvent.click(pauseBtn)
    expect(getByRole('button', { name: 'Play background video' }).getAttribute('aria-pressed')).toBe('true')
    expect(pauseSpy).toHaveBeenCalledWith()
    // flip the element back to "paused" so the resume branch runs
    Object.defineProperty(video, 'paused', { value: true, configurable: true })
    fireEvent.click(getByRole('button', { name: 'Play background video' }))
    expect(getByRole('button', { name: 'Pause background video' })).toBeTruthy()
    expect(playSpy).toHaveBeenCalledTimes(1)
    playSpy.mockRestore()
    pauseSpy.mockRestore()
  })
})
