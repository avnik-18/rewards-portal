import { mirrorFetch } from './mirror'

/** One row of the login screen's demo-identity dropdown â€” verbatim backend
 *  names (GET /auth/demo-users, local-only). */
export interface AuthUser {
  employee_code: string
  full_name: string
  title: string | null
  department: string | null
}

export async function getDemoUsers(): Promise<AuthUser[]> {
  return mirrorFetch('/auth/demo-users') as Promise<AuthUser[]>
}

