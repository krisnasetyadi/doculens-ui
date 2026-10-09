import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-manrope text-[13px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:aria-busy:opacity-80",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // 36px, 40px on a phone: the one touch-friendly height for every text button.
        default: 'h-9 px-4 py-2 max-sm:h-10 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
        // Compact: a button inside a dense row or toolbar.
        xs: 'h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        // Icon-only: 28px for an action inside a row or message, 36px everywhere else.
        icon: 'size-9',
        'icon-sm': 'size-7',
      },
    },
    // A link is text: it never carries a button's height or padding, whatever the size.
    compoundVariants: [{ variant: 'link', class: 'h-auto p-0' }],
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
