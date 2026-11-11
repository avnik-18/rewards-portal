import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { drawRecognitionCard, type RecognitionCardArt } from '@/lib/recognition-card'
import { CORE_VALUES, VALUE_KEYS } from '@/lib/mock-data'

// jsdom has no real canvas â€” fake the 2d context so the drawing routine's
// logic (wrap, banner, initials, points badge, value chip) can be exercised.
class RecordingCtx {
  ops: string[] = []
  fillStyle = ''
  strokeStyle = ''
  font = ''
  textAlign = ''
  textBaseline = ''
  lineWidth = 0

  measureText(text: string) {
    this.ops.push(`measure:${text}`)
    return { width: text.length * 10 } as TextMetrics
  }

  fillText(text: string, x: number, y: number) {
    this.ops.push(`fill:${text}@${x},${y}`)
  }

  fillRect() {
    this.ops.push('fillRect')
  }
  drawImage() {
    this.ops.push('drawImage')
  }
  beginPath() {
    this.ops.push('begin')
  }
  closePath() {
    this.ops.push('close')
  }
  moveTo(x: number, y: number) {
    this.ops.push(`move:${x},${y}`)
  }
  lineTo(x: number, y: number) {
    this.ops.push(`line:${x},${y}`)
  }
  arcTo() {
    this.ops.push('arcTo')
  }
  arc(...args: unknown[]) {
    this.ops.push(`arc:${String(args[2])}`)
  }
  stroke() {
    this.ops.push('stroke')
  }
  fill() {
    this.ops.push('fillShape')
  }

  createLinearGradient(): { addColorStop: (stop: number, color: string) => void } {
    this.ops.push('gradient')
    return { addColorStop: () => this.ops.push('gradientStop') }
  }
}

async function stubCanvas(ctx: RecordingCtx | null, toDataUrl: () => string) {
  let current: RecordingCtx | null = ctx
  const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    Object.defineProperty(this, 'toDataURL', { value: toDataUrl })
    return current as unknown as CanvasRenderingContext2D
  })

  return {
    setContext(next: RecordingCtx | null) {
      current = next
    },
    restore() {
      getContextSpy.mockRestore()
    },
  }
}

// jsdom creates detached Image elements and never resolves their loads â€”
// capture each constructed Image and dispatch the event ourselves.
let createdImages: HTMLImageElement[] = []

function installImageSpy() {
  createdImages = []
  const originalImage = window.Image
  const spy = vi.fn(function FakeImage(...args: ConstructorParameters<typeof Image>) {
    const img = new originalImage(...args)
    createdImages.push(img)
    return img
  })
  Object.defineProperty(window, 'Image', { value: spy, configurable: true, writable: true })
  return () => {
    Object.defineProperty(window, 'Image', { value: originalImage, configurable: true, writable: true })
  }
}

async function fireImageLoad() {
  await vi.waitFor(() => createdImages.length > 0)
  for (const img of createdImages) img.dispatchEvent(new Event('load'))
}

const baseArt: RecognitionCardArt = {
  bannerUrl: '/xoxo/banner.png',
  message: 'Priya shipped the migration ahead of the deadline',
  receiverFirstName: 'Priya',
  receiverInitials: 'PM',
  points: 25,
  valueLabel: CORE_VALUES[VALUE_KEYS[0]].label,
}

beforeEach(() => {
  createdImages = []
})

afterEach(() => {
  createdImages = []
})

describe('drawRecognitionCard', () => {
  it('rejects cleanly when the 2d context is unavailable', async () => {
    const restoreImage = installImageSpy()
    const stub = await stubCanvas(null, () => '')
    await expect(drawRecognitionCard(baseArt)).rejects.toThrow('canvas unavailable')
    stub.restore()
    restoreImage()
  })

  it('draws the whole card and returns the PNG data URL', async () => {
    const restoreImage = installImageSpy()
    const ctx = new RecordingCtx()
    const toDataUrl = vi.fn(() => 'data:image/png;base64,card')
    const stub = await stubCanvas(ctx, toDataUrl)
    const pending = drawRecognitionCard(baseArt)
    await fireImageLoad()
    const dataUrl = await pending
    stub.restore()
    restoreImage()

    expect(dataUrl).toBe('data:image/png;base64,card')
    // the white card base + banner + message + footer divider + gradient avatar
    expect(ctx.ops.filter((op) => op === 'fillRect').length).toBeGreaterThanOrEqual(2)
    expect(ctx.ops).toContain('drawImage')
    expect(ctx.ops).toContain('gradient')
    expect(ctx.ops.join('|')).toContain('fill:PM')
    expect(ctx.ops.join('|')).toContain('fill:Priya')
    expect(ctx.ops.join('|')).toContain('measure:+25 pts')
    expect(ctx.ops.join('|')).toContain(`fill:${CORE_VALUES[VALUE_KEYS[0]].label}`)

    // lines wrap before the width limit â€” several fills in the body region
    const bodyFills = ctx.ops.filter((op) => op.startsWith('fill:') && !op.includes('PM') && !op.includes('Priya'))
    expect(bodyFills.length).toBeGreaterThan(0)
  })

  it('renders without a points badge or value chip when both are off', async () => {
    const restoreImage = installImageSpy()
    const ctx = new RecordingCtx()
    const stub = await stubCanvas(ctx, () => 'data:image/png;base64,plain')
    const pending = drawRecognitionCard({ ...baseArt, points: 0, valueLabel: undefined })
    await fireImageLoad()
    await pending
    stub.restore()
    restoreImage()

    const joined = ctx.ops.join('|')
    expect(joined).not.toContain('+0 pts')
    // only the message lines, the initials and the receiver name are drawn
    const messageFills = ctx.ops.filter((op) => op.startsWith('fill:') && op !== 'fill:PM' && op !== 'fill:Priya')
    expect(messageFills.length).toBeGreaterThan(0)
  })
})
