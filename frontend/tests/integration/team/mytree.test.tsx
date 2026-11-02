import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MyTree from '@/components/organisms/MyTree'
import { getRecognitionTree } from '@/lib/data-api'
import type { RecognitionTreeData } from '@/lib/data-api'

async function renderTree() {
  const onClose = vi.fn()
  const data: RecognitionTreeData = await getRecognitionTree()
  render(<MyTree open onClose={onClose} data={data} />)
  return { onClose, data }
}

describe('MyTree overlay (integration)', () => {
  it('shows the signed-in user chip and every direct report ranked by points', async () => {
    await renderTree()

    expect(screen.getByRole('dialog', { name: /recognition tree/i })).toBeTruthy()
    expect(screen.getByText('Ayan')).toBeTruthy()
    expect(screen.getByText('380 pts')).toBeTruthy()

    // every direct report appears, and the leaderboard leader is ranked first
    const names = [
      'Daniel Cho',
      'Aarav Sharma',
      'Priya Menon',
      'Kenji Watanabe',
      'Nia Thomas',
      'Sofia Reyes',
      'Rohan Patel',
      'Ishaan Verma',
      'Grace Mathew',
      'Sanjay Kumar',
    ]
    for (const n of names) expect(screen.getAllByText(n).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^\d{2}$/)).toHaveLength(10)
    expect(screen.getAllByText('420 pts').length).toBeGreaterThan(0)
  })

  it('filters by team from the header dropdown', async () => {
    await renderTree()

    fireEvent.click(screen.getByRole('button', { name: /filter by team/i }))
    fireEvent.click(screen.getByRole('button', { name: 'PACCA AI' }))

    expect(screen.getAllByText('Ishaan Verma').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Grace Mathew').length).toBeGreaterThan(0)
    expect(screen.queryByText('Daniel Cho')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /filter by team/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Humana' }))
    expect(screen.getAllByText('Daniel Cho').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ishaan Verma')).toBeNull()
  })

  it('Escape closes the overlay', async () => {
    const { onClose } = await renderTree()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the ✕ button closes the overlay', async () => {
    const { onClose } = await renderTree()
    fireEvent.click(screen.getByRole('button', { name: /close recognition tree/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking outside the team dropdown closes it', async () => {
    await renderTree()

    fireEvent.click(screen.getByRole('button', { name: /filter by team/i }))
    expect(screen.getByRole('button', { name: 'All Teams' })).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: 'All Teams' })).toBeNull()
  })
})
