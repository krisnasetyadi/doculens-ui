import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

// One badge for the whole app: Manrope 10 bold caps. The tone is the only choice a screen makes.
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border border-transparent px-1.5 py-1 font-manrope text-[10px] font-bold uppercase leading-none tracking-[0.06em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        // Solid primary: the one badge that must stand out (a primary key, a count on a dark chip).
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary-hover',
        // Soft tones: a wash of the colour with its ink.
        secondary: 'bg-[#eef1f6] text-muted-foreground dark:bg-muted',
        info: 'bg-info-soft text-info-ink',
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        destructive: 'bg-danger-soft text-danger-ink',
        outline: 'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
