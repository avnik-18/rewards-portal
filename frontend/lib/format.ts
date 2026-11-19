export const fmtNum = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

/** "2 h ago"/"Yesterday"-style label for a feed timestamp (the backend feed
 *  ships ISO stamps where the mock dataset shipped ready-made strings). */
export function fmtWhen(iso: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const minutes = Math.round((Date.now() - then.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
