import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:aria-busy:opacity-80",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

/** The spinner inside a loading button: decorative, since the button itself carries aria-busy. */
function ButtonSpinner() {
  return <Spinner aria-hidden="true" role="presentation" aria-label={undefined} />
}

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** The action is running: the button is disabled and shows a spinner. */
    loading?: boolean
    /** The in-progress label ("Saving…"), shown instead of the children while `loading`. One "…" character, English. */
    loadingText?: string
    /** Leading icon. While `loading` the spinner takes its place, so the button never shows both. */
    icon?: React.ReactNode
  }

/**
 * The one button. `loading` is the loading behaviour of the whole app: disabled, a spinner where the
 * icon was, and the label switched to `loadingText`. An icon-only button (size icon*) shows just the
 * spinner. Pass the leading icon as `icon` (not inside the children), so the spinner can replace it.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  icon,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  const iconOnly = typeof size === 'string' && size.startsWith('icon')
  const spinner = <ButtonSpinner />

  return (
    <Comp
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : iconOnly ? (
        loading ? spinner : (icon ?? children)
      ) : (
        <>
          {loading ? spinner : icon}
          {loading && loadingText ? loadingText : children}
        </>
      )}
    </Comp>
  )
}

export { Button, ButtonSpinner, buttonVariants }
export type { ButtonProps }
