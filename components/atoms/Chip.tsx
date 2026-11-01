import type { HTMLAttributes, ReactNode } from 'react'

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode
}

export function Chip({ children, className = '', ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
