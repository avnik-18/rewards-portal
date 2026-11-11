import { useEffect } from 'react'

const APP_SUFFIX = ' · emids Rewards & Recognition'

/** Per-page document titles — Next.js gave each route a title; plain React must call this. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title === 'Dashboard' ? 'emids · Rewards & Recognition' : `${title}${APP_SUFFIX}`
  }, [title])
}
