import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/atoms/Modal'

/** Harness mirrors the two real close styles:
 *  - conditional=false: caller toggles `open` (MemberInfoModal)
 *  - conditional=true: caller unmounts the whole modal
 *    ({composerOpen && <ShareComposer/>}) — no '!open' branch ever runs. */
function Harness({ conditional }: { conditional: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
        Share
      </button>
      {conditional ? (
        open && (
          <div data-testid="host">
            <Modal
              open
              onClose={() => {
                setOpen(false)
              }}
              label="Test dialog"
            >
              <button type="button">First action</button>
              <button type="button">Last action</button>
            </Modal>
          </div>
        )
      ) : (
        <Modal
          open={open}
          onClose={() => {
            setOpen(false)
          }}
          label="Test dialog"
        >
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </Modal>
      )}
    </>
  )
}

function openModal(conditional: boolean) {
  const view = render(<Harness conditional={conditional} />)
  const trigger = screen.getByTestId('trigger')
  trigger.focus()
  fireEvent.click(trigger)
  return { view, trigger }
}

describe('Modal (a11y island)', () => {
  it('focus lands on the first control on open', () => {
    const { view } = openModal(false)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First action' }))
    view.unmount()
  })

  it('Tab wraps from the last control to the first, Shift+Tab back', () => {
    const { view } = openModal(false)
    screen.getByRole('button', { name: 'Last action' }).focus()

    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First action' }))

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last action' }))
    view.unmount()
  })

  it('Escape closes via the latest inline onClose', () => {
    const { view } = openModal(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(view.container.querySelector('[role="dialog"]')).toBeNull()
    view.unmount()
  })

  it('closes by unmount and still returns focus to the trigger (WCAG 2.4.3)', () => {
    const { view, trigger } = openModal(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(view.container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    view.unmount()
  })

  it('same focus return when the caller toggles `open` off (MemberInfoModal style)', () => {
    const { view, trigger } = openModal(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.activeElement).toBe(trigger)
    view.unmount()
  })
})
