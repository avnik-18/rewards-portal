/* No 'use client' — CloseX owns no state or handlers of its own; it only
   forwards the caller's onClick, and every current caller is a client
   component (member-info-modal). */
import { X } from 'lucide-react'

export interface CloseXProps {
  onClick: () => void
  className?: string
}

export function CloseX({ onClick, className = '' }: CloseXProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className={`absolute right-4 top-4 rounded-full p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink ${className}`}
    >
      <X size={18} />
    </button>
  )
}
