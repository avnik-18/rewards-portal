import { apiFetch } from '../api-client'

/** One row of the login screen's demo-identity dropdown — verbatim backend
 *  names (GET /auth/demo-users, local-only). */
export interface AuthUser {
  employee_code: string
  full_name: string
  title: string | null
  department: string | null
  persona?: string
}

export async function getDemoUsers(): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>('/auth/demo-users')
}
