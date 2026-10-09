import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * A plain surface: 12px corner, hairline, no layout of its own. The one place a bordered panel,
 * a table frame, a drop zone or an empty-state well gets its shape, so none of them restates
 * `rounded-xl border bg-card`. Use `Card` when you need its header/content/footer slots.
 */
const panelVariants = cva('rounded-xl border', {
  variants: {
    tone: {
      default: 'border-border bg-card shadow-xs',
      // A recessed box inside another surface (a note, a code block, an empty-state well).
      muted: 'border-border bg-muted/40',
      dashed: 'border-dashed border-border bg-card',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    },
  },
  defaultVariants: { tone: 'default', padding: 'none' },
})

function Panel({ className, tone, padding, ...props }: ComponentProps<'div'> & VariantProps<typeof panelVariants>) {
  return <div data-slot="panel" className={cn(panelVariants({ tone, padding }), className)} {...props} />
}

export { Panel, panelVariants }
