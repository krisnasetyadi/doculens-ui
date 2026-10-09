'use client'

import type { ComponentProps, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DANGER_ICON_BUTTON_CLASS } from '@/lib/danger-styles'
import { cn } from '@/lib/utils'

type IconButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'children' | 'icon' | 'aria-label'> & {
  /** Names the action: the tooltip text and the screen-reader label. */
  label: string
  /** `sm` is 28px (an action inside a row or message); `md` is 36px (everywhere else). */
  size?: 'sm' | 'md'
  /** The action deletes or removes something: grey at rest, red on hover. */
  danger?: boolean
  /** The glyph. While `loading` the spinner takes its place. */
  children: ReactNode
  tooltipSide?: ComponentProps<typeof TooltipContent>['side']
}

const MUTED_GHOST_CLASS = 'text-muted-foreground hover:text-foreground'

/**
 * The one icon-only button: 28px or 36px, always with a tooltip and a screen-reader label.
 * Shape, colour and hover come from the shared Button; pass a `variant` and a `size`, or `danger`.
 * A ghost icon button is muted at rest, so call sites never set a colour.
 */
export function IconButton({
  label,
  size = 'md',
  variant = 'ghost',
  danger = false,
  tooltipSide,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size === 'sm' ? 'icon-sm' : 'icon'}
          aria-label={label}
          className={cn(variant === 'ghost' && (danger ? DANGER_ICON_BUTTON_CLASS : MUTED_GHOST_CLASS), className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  )
}
