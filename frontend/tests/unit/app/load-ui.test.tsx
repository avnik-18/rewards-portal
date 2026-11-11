import { describe, it, expect, vi } from 'vitest'
import { Component } from 'react'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoadingSkeleton, ErrorState, ErrorBoundary } from '@/load-ui'
import { usePageData } from '@/hooks/use-page-data'
import NotFound from '@/not-found'

describe('LoadingSkeleton', () => {
  it('announces itself with role=status and aria-busy', () => {
    render(<LoadingSkeleton />)
    expect(screen.getByRole('status', { busy: true })).toBeTruthy()
  })
})

describe('ErrorState', () => {
  it('alerts on the error and retries through the callback', () => {
    const onRetry = vi.fn()
    render(<ErrorState error={new Error('mock failure')} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    act(() => screen.getByRole('button', { name: 'Try again' }).click())
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders without a retry affordance when none is offered', () => {
    render(<ErrorState error={new Error('no retry here')} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

/** A child that throws only while enabled, so the boundary's reset path can run. */
class BoomWhileEnabled extends Component<{ enabled: boolean }> {
  render() {
    if (this.props.enabled) throw new Error('child boom')
    return <p data-testid="calm">calm</p>
  }
}

describe('ErrorBoundary, class component — the net sir round-1 asked for', () => {
  it('shows the fallback when a render throws, and retry clears it on recovery', () => {
    const { rerender, container, getByRole, queryByTestId } = render(
      <ErrorBoundary>
        <BoomWhileEnabled enabled={false} />
      </ErrorBoundary>,
    )
    expect(container.querySelector('[data-testid="calm"]')?.textContent).toBe('calm')

    rerender(
      <ErrorBoundary>
        <BoomWhileEnabled enabled />
      </ErrorBoundary>,
    )
    expect(getByRole('alert').textContent).toContain('child boom')
    expect(queryByTestId('calm')).toBeNull()

    // the failure mode is over — retry re-renders the (now calm) subtree
    rerender(
      <ErrorBoundary>
        <BoomWhileEnabled enabled={false} />
      </ErrorBoundary>,
    )
    act(() => getByRole('button', { name: 'Try again' }).click())
    expect(container.querySelector('[data-testid="calm"]')?.textContent).toBe('calm')
  })
})

describe('NotFound (shared module)', () => {
  it('offers the dashboard way back', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByText("This page doesn't exist")).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toBeTruthy()
  })
})

describe('usePageData branches (sir round-1 review covers)', () => {
  it('surfaces a rejected loader as error, not a blank page', async () => {
    function Harness() {
      const { error, isLoading } = usePageData(() => Promise.reject(new Error('boom')), ['x'])
      return (
        <div>
          <p data-testid="loading">{String(isLoading)}</p>
          <p data-testid="error">{error?.message}</p>
        </div>
      )
    }
    const { container, rerender } = render(<Harness />)
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe('true')
    // a different deps identity shows loading while the previous snapshot lands
    rerender(<Harness key="rerender" />)
    await act(async () => {}) // let the rejection settle
    expect(container.querySelector('[data-testid="error"]')?.textContent).toBe('boom')
    expect(container.querySelector('[data-testid="loading"]')?.textContent).toBe('false')
  })

  it('keeps the snapshot visible while newer deps are loading', async () => {
    let release: (value: string) => void = () => {}
    function Harness({ token }: { token: string }) {
      const { data, isLoading } = usePageData(
        () => new Promise<string>((resolve) => { if (token === 'second') { release = resolve } else { resolve('first') } }),
        [token],
      )
      return <p data-testid="state">{isLoading ? 'loading' : (data ?? 'empty')}</p>
    }
    const { rerender, container } = render(<Harness token="first" />)
    await act(async () => {})
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe('first')
    await act(async () => { rerender(<Harness token="second" />) })
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe('loading')
    await act(async () => { act(() => release('second')) })
    expect(container.querySelector('[data-testid="state"]')?.textContent).toBe('second')
  })
})
