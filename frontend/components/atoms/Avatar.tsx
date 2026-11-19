import { person, initials } from '@/lib/data-api'

const GRADIENTS = [
  'from-[#2563eb] to-[#4facfe]',
  'from-[#7a5af8] to-[#b58cff]',
  'from-[#0fa3a3] to-[#38d9d9]',
  'from-[#ff8938] to-[#ffb224]',
  'from-[#ff5a5f] to-[#ff9a8b]',
  'from-[#0ea5e9] to-[#6ee7b7]',
  'from-[#154071] to-[#5a6a83]',
  'from-[#ec4899] to-[#f97316]',
]

function hashStr(text: string) {
  let hash = 0
  for (let charIndex = 0; charIndex < text.length; charIndex++) hash = (hash * 31 + text.charCodeAt(charIndex)) >>> 0
  return hash
}

/** Avatar profile fallback: an explicit `name` covers live rows whose id has
 *  no directory registration yet (leaderboard/notifications UUID ids) —
 *  never silently resolve to the signed-in user. */
export function Avatar({
  id,
  name,
  size = 36,
  ring = false,
}: {
  id: string
  name?: string
  size?: number
  ring?: boolean
}) {
  const profile = person(id)
  const fallbackName = name ?? profile?.name
  if (!fallbackName) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-slate-300 font-semibold text-slate-500"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        ?
      </div>
    )
  }
  const gradient = GRADIENTS[hashStr(fallbackName) % GRADIENTS.length]
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white select-none ${gradient}`}
        style={{ fontSize: size * 0.38 }}
      >
        {initials(fallbackName)}
      </div>
      {profile?.status === 'online' && size >= 32 && (
        <span
          className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-mint"
          role="img"
          aria-label="online"
        />
      )}
      {ring && <span className="absolute inset-0 rounded-full ring-2 ring-gold/60" />}
    </div>
  )
}
