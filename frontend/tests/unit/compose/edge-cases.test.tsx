import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePageData } from '@/hooks/use-page-data'
import { useComposeForm } from '@/hooks/use-compose-form'
import { drawRecognitionCard } from '@/lib/recognition-card'
import { buildPostDraft } from '@/lib/share-post'
import { PEOPLE } from '@/lib/mock-data'
import type { CreatedRecognition } from '@/lib/data-api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePageData â€” cancellation branch', () => {
  it('a result landing after unmount never overwrites state', async () => {
    // loader resolves on the NEXT macro task â€” long enough to unmount first
    let release: (value: { value: number }) => void = () => {}
    const hanging = new Promise<{ value: number }>((resolve) => {
      release = resolve
    })

    const { result, unmount } = renderHook(() => usePageData(() => hanging, []))
    unmount()
    act(() => release({ value: 7 }))
    // cancelled before the data landed â€” the hook never adopts it
    expect(result.current.data).toBeFalsy()
    expect(result.current.error).toBeFalsy()
  })
})

const manRecognition: CreatedRecognition = { id: 'rec-x' } as unknown as CreatedRecognition
const sendCalls: unknown[] = []
vi.mock('@/lib/data-api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/data-api')>()
  return {
    ...mod,
    sendRecognition: (input: unknown) => {
      sendCalls.push(input)
      return Promise.resolve(manRecognition)
    },
  }
})

describe('useComposeForm â€” artUrl fallback beyond the variant list', () => {
  it('an out-of-range variant falls back to the first template URL at send time', async () => {
    const dirPeople = Object.values(PEOPLE)
      .filter((entry) => entry.id !== 'me')
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        title: entry.title,
        email: entry.email,
        managerId: entry.managerId,
      }))
    const { result } = renderHook(() => useComposeForm(dirPeople))

    await act(async () => {
      result.current.addToSel('p1')
      result.current.chooseValue('ownership')
      result.current.setMessage('Priya shipped the migration ahead of the deadline.')
      result.current.setPoints(25)
    })
    act(() => result.current.setVariantIdx(99))

    await act(async () => {
      await result.current.submit()
    })
    // the first template URL ships â€” no undefined art even with a broken variant index
    const call = sendCalls.at(-1) as { artUrl?: string } | undefined
    expect(call?.artUrl).toBeTypeOf('string')
    expect((call?.artUrl ?? '').startsWith('/xoxo/')).toBe(true)
  })
})

describe('buildPostDraft — value-less drafts', () => {
  it('omits the value credit and the separator dot when no value is given', () => {
    const draft = buildPostDraft({ receiver: 'this colleague', giver: 'Ayan', message: 'Great work.' })
    expect(draft).toContain('\n\nRecognized by Ayan · emids Technologies\n')
    expect(draft).not.toContain('undefined')
  })
})

describe('drawRecognitionCard â€” banner load failure', () => {
  it('still returns the postcard when the banner image fails to load', async () => {
    const ctx: Record<string, unknown> = {
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
      measureText: (text: string) => ({ width: text.length * 10 }),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arcTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
    }

    const originalImage = window.Image
    const toDataUrl = vi.fn(() => 'data:image/png;base64,ok')
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      Object.defineProperty(this, 'toDataURL', { value: toDataUrl })
      return ctx as unknown as CanvasRenderingContext2D
    })

    // capture the banner img and fire its ERROR event this time
    const images: HTMLImageElement[] = []
    window.Image = function FakeImage(...args: ConstructorParameters<typeof Image>) {
      const img = new originalImage(...args)
      images.push(img)
      return img
    } as unknown as typeof Image

    try {
      const pending = drawRecognitionCard({
        bannerUrl: '/xoxo/missing-banner.webp',
        message: 'Fallback banner check',
        receiverFirstName: 'Priya',
        receiverInitials: 'PM',
        points: 0,
      })
      await vi.waitFor(() => images.length > 0)
      images[0].dispatchEvent(new Event('error'))
      await pending

      expect(toDataUrl).toHaveBeenCalled()
      expect(ctx.drawImage).not.toHaveBeenCalled()
    } finally {
      window.Image = originalImage
      getContextSpy.mockRestore()
    }
  })
})
