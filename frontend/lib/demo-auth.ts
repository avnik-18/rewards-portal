/**
 * Demo-identity selection for the local login screen, backed by
 * localStorage so one browser session holds exactly one picked person.
 *
 * The SSO swap point stays api-client.ts: when Entra SSO lands, the
 * X-Demo-User header is replaced by a Bearer token and this module's reads
 * stop feeding identity (the login screen's SSO button already promises
 * that swap — "Entra SSO lands with the production rollout").
 */

const STORAGE_KEY = 'applause-demo-user'

/** The explicitly picked code, or null when nothing has been picked yet
 *  (the login guard treats null as "not signed in"). */
export function selectedDemoUser(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function selectDemoUser(employeeCode: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, employeeCode)
  } catch {
    // jsdom headless / privacy-mode storage: selection simply doesn't persist
  }
}

export function clearDemoUser(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clear without storage
  }
}

/** The header api-client attaches: the picked user wins, then the env value.
 *  Nothing is INVENTED — with neither, the caller sends no identity at all
 *  instead of a hardcoded code that stops existing the moment the directory
 *  doesn't hold it (sir's attack round: a stale/fake identity must fail loud
 *  at the edge it is used, not pretend to be someone). */
export function activeDemoUser(): string | null {
  const envUser = import.meta.env.VITE_DEMO_USER
  return selectedDemoUser() ?? (envUser || null)
}
