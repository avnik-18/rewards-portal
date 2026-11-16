import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { activeDemoUser, clearDemoUser, selectDemoUser, selectedDemoUser } from '@/lib/demo-auth'

const envBag = import.meta.env as Record<string, string | undefined>
const ORIGINAL_USER = envBag.VITE_DEMO_USER

beforeEach(() => {
  window.localStorage.clear()
  delete envBag.VITE_DEMO_USER
})

// demo-auth reads the runtime env object directly — put back what this file
// removed so its neighbouring suites in the same worker are unaffected
afterEach(() => {
  envBag.VITE_DEMO_USER = ORIGINAL_USER
})

describe('demo identity selection', () => {
  it('selects, reads and clears the picked code', () => {
    expect(selectedDemoUser()).toBeNull()
    selectDemoUser('E-L1')
    expect(selectedDemoUser()).toBe('E-L1')
    clearDemoUser()
    expect(selectedDemoUser()).toBeNull()
  })

  it('header value: the picked user wins over the env fallback', () => {
    envBag.VITE_DEMO_USER = 'E-BR'
    selectDemoUser('E-L1')
    expect(activeDemoUser()).toBe('E-L1')
  })

  it('falls back to the env value when nothing is picked', () => {
    envBag.VITE_DEMO_USER = 'E-BR'
    expect(activeDemoUser()).toBe('E-BR')
  })

  it('with neither pick nor env there is NO identity — null, never an invented code', () => {
    envBag.VITE_DEMO_USER = 'E-BR'
    delete envBag.VITE_DEMO_USER
    expect(activeDemoUser()).toBeNull()
    // clearing hands control back to the env, not to a hardcoded person
    envBag.VITE_DEMO_USER = 'E-BR'
    selectDemoUser('E-009')
    clearDemoUser()
    expect(activeDemoUser()).toBe('E-BR')
  })
})
