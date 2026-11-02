import type { ReactNode } from 'react'

export interface SectionTitleProps {
  children: ReactNode
  right?: ReactNode
}

export function SectionTitle({ children, right }: SectionTitleProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="text-xl font-extrabold tracking-tight text-navy">{children}</h2>
      {right}
    </div>
  )
}
