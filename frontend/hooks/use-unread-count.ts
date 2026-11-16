import { useEffect, useState } from 'react'
import { getUnreadCount } from '@/lib/data-api'

/** Deliverable #6 in the UI — the bell badge. Undefined while loading (dot hidden). */
export function useUnreadCount(): number | undefined {
  const [unread, setUnread] = useState<number | undefined>(undefined)

  useEffect(() => {
    getUnreadCount().then(setUnread)
  }, [])

  return unread
}
