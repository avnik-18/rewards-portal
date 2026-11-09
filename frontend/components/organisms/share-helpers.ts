import { CORE_VALUES, VALUE_KEYS, VALUE_TEMPLATES } from '@/lib/data-api'

/** The value's banner variants, or a fallback image without a value chip. */
export function imagesForValueLabel(label?: string): string[] {
  // labels arrive card-formatted ("Customer first") while the token file keeps "Customer First"
  const sought = (label ?? '').trim().toLowerCase()
  const valueKey = VALUE_KEYS.find((key) => CORE_VALUES[key].label.toLowerCase() === sought)
  return valueKey ? [...VALUE_TEMPLATES[valueKey][0].urls] : ['/img1.webp']
}

/** Guaranteed copy: clipboard API first, hidden-textarea select+execCommand fallback. */
export async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const helper = document.createElement('textarea')
      helper.value = value
      helper.style.position = 'fixed'
      helper.style.opacity = '0'
      document.body.appendChild(helper)
      helper.select()
      const ok = document.execCommand('copy')
      helper.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Downloads the rastered postcard — additive nicety, never hard-fails the flow. */
export function saveCardImage(cardDataUrl: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = cardDataUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
