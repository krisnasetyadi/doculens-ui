import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** The rounded square behind an icon (a file type, a connection, an empty state): 12px corner, centred glyph. */
const iconTileVariants = cva('inline-grid shrink-0 place-items-center rounded-xl', {
  variants: {
    size: {
      md: 'size-9',
      lg: 'size-10',
    },
    tone: {
      muted: 'bg-muted text-muted-foreground',
      primary: 'bg-primary/10 text-primary',
      accent: 'bg-accent text-primary',
      danger: 'bg-danger-soft text-danger-ink',
      // The caller supplies the colours (a file type's own palette).
      none: '',
    },
  },
  defaultVariants: { size: 'md', tone: 'muted' },
})

function IconTile({ className, size, tone, ...props }: ComponentProps<'span'> & VariantProps<typeof iconTileVariants>) {
  return <span aria-hidden="true" data-slot="icon-tile" className={cn(iconTileVariants({ size, tone }), className)} {...props} />
}

export { IconTile, iconTileVariants }
