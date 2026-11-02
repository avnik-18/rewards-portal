// Draws the full recognition postcard (banner + message + paw-nalis strip)
// as a single PNG data URL using the 2D canvas — no external libraries.

import { CORE_VALUES, VALUE_KEYS } from './mock-data'
import type { ValueKey } from './mock-data'

const VALUE_SOLID: Record<ValueKey, string> = {
  customerFirst: '#0fa3a3',
  innovation: '#ff8938',
  collaboration: '#7a5af8',
  ownership: '#17b26a',
  winningMindset: '#ff5a5f',
}

export interface RecognitionCardArt {
  /** Banner image URL (the picked template variant). */
  bannerUrl: string
  /** The message printed on the card body (plain text, quotes already stripped). */
  message: string
  /** Recipient first name for the bottom strip. */
  receiverFirstName: string
  /** Recipient initials shown in the avatar circle. */
  receiverInitials: string
  /** Points badge number (0 hides the badge). */
  points: number
  /** Value chip label ("Ownership" | undefined). */
  valueLabel?: string
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Renders the full postcard to a PNG data URL (entirely client-side). */
export async function drawRecognitionCard(art: RecognitionCardArt): Promise<string> {
  const W = 1100
  const bannerH = 314
  const bodyH = 300
  const footH = 96
  const H = bannerH + bodyH + footH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  // card background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // banner — natural size, full width, top-cropped
  const banner = await loadImage(art.bannerUrl)
  if (banner) ctx.drawImage(banner, 0, 0, banner.width, banner.height, 0, 0, W, bannerH)

  // body — the recognition message
  let y = bannerH + 96
  ctx.fillStyle = '#16324f'
  ctx.font = '600 40px Inter, "Segoe UI", sans-serif'
  ctx.textBaseline = 'top'
  for (const line of wrapText(ctx, art.message, W - 140)) {
    ctx.fillText(line, 70, y)
    y += 64
    if (y > bannerH + bodyH - 40) break
  }

  // footer strip
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, bannerH + bodyH, W, footH)
  ctx.strokeStyle = '#e3e9f2'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, bannerH + bodyH + 1)
  ctx.lineTo(W, bannerH + bodyH + 1)
  ctx.stroke()

  // avatar circle + initials
  const avX = 70
  const avY = bannerH + bodyH + footH / 2
  const grad = ctx.createLinearGradient(avX - 20, avY - 20, avX + 20, avY + 20)
  grad.addColorStop(0, '#0fa3a3')
  grad.addColorStop(1, '#38d9d9')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(avX, avY, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 15px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(art.receiverInitials, avX, avY + 1)

  // receiver name
  ctx.fillStyle = '#154071'
  ctx.font = '700 22px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(art.receiverFirstName, avX + 34, avY)

  // points badge
  let bx = avX + 34 + ctx.measureText(art.receiverFirstName).width + 18
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (art.points > 0) {
    const label = `+${art.points} pts`
    ctx.font = '800 17px Inter, sans-serif'
    const pw = ctx.measureText(label).width + 28
    ctx.fillStyle = '#ffb224'
    roundRect(ctx, bx, avY - 16, pw, 32, 16)
    ctx.fill()
    ctx.fillStyle = '#3d2b00'
    ctx.fillText(label, bx + pw / 2, avY + 1)
    bx += pw + 16
  }

  // value chip — pushed to the right edge
  if (art.valueLabel) {
    const key = VALUE_KEYS.find((k) => CORE_VALUES[k].label === art.valueLabel)
    if (key) {
      ctx.font = '700 17px Inter, sans-serif'
      const vw = ctx.measureText(art.valueLabel).width + 28
      let vx = W - 70 - vw
      ctx.fillStyle = '#e6f4f8'
      ctx.fillStyle = 'rgba(13,147,132,0.12)'
      roundRect(ctx, vx, avY - 16, vw, 32, 16)
      ctx.fill()
      ctx.fillStyle = '#0e9384'
      ctx.fillText(art.valueLabel, vx + vw / 2, avY + 1)
    }
  }

  return canvas.toDataURL('image/png')
}
