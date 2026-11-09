import { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import type { ReactNode } from 'react'

export interface ModalProps {
  /** Whether the dialog is mounted. */
  open: boolean
  /** Wired to the Escape key and backdrop. */
  onClose: () => void
  children: ReactNode
  /** Wide variant for template previews. */
  wide?: boolean
  /** Accessible dialog label. */
  label?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The modal body is position:fixed, so offsetParent is always null in real
 *  browsers — visibility is hidden-ness, not layout ancestors. */
const isShown = (el: HTMLElement) => {
  if (el.hidden) return false
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

export function Modal({ open, onClose, children, wide = false, label = 'Dialog' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // sir's review: callers pass inline arrow onClose, so the open-effect must
  // read the latest callback without re-running — a re-run while open would
  // clobber the stored trigger and steal focus back to the first control
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    // The trigger is whatever had focus when the dialog opened; focus returns
    // to it on unmount, which also covers callers that close by unmounting
    // the whole modal (no '!open' branch ever runs for them).
    const trigger = document.activeElement as HTMLElement | null

    const dialogNode = dialogRef.current
    // sir: initial focus — first focusable element inside the dialog
    const first = dialogNode?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      // sir: focus trap — Tab cycles inside the dialog only
      if (e.key !== 'Tab' || !dialogNode) return
      const focusable = Array.from(dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isShown)
      if (focusable.length === 0) return
      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      trigger?.focus?.()
    }
  }, [open])

  if (!open) return null
  return ReactDOM.createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-navy-deep/50 backdrop-blur-[3px]" onClick={() => onCloseRef.current()} />
      <div
        className={`relative m-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl max-h-[92vh] flex flex-col animate-rise`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
