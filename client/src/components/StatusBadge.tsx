// A status pill. The word is always shown, because primary and success are both green.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'danger' | 'warning' | 'draft'

const tones: Record<StatusTone, string> = {
  success: 'bg-success-subtle text-success',
  danger: 'bg-destructive-subtle text-destructive',
  warning: 'bg-warning-subtle text-warning',
  draft: 'border border-border bg-card text-foreground',
}

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit items-center rounded-full px-2 text-xs font-semibold whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}
