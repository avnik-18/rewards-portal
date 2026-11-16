import { describe, it, expect } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useUnreadCount } from '@/hooks/use-unread-count'

function Demo() {
  const unread = useUnreadCount()
  return <span data-testid="value">{unread === undefined ? 'loading' : unread}</span>
}

describe('useUnreadCount', () => {
  it('starts undefined (dot hidden) and settles on the live unread count', async () => {
    const { getByText } = render(<Demo />)
    expect(getByText('loading')).toBeTruthy()
    await waitFor(() => expect(getByText('3')).toBeTruthy()) // the setup stub's unread
  })
})
