'use client'

import { useRef, type ReactElement, type SyntheticEvent } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * True when the element, or anything inside it, is cut off by `truncate` or `line-clamp`.
 * Only nodes that actually clip with an ellipsis count, so an icon glyph that overflows its box does not.
 */
function isClipped(root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  return nodes.some((node) => {
    const { textOverflow, webkitLineClamp } = getComputedStyle(node) as CSSStyleDeclaration & { webkitLineClamp?: string }
    if (textOverflow === 'ellipsis') return node.scrollWidth > node.clientWidth
    return Boolean(webkitLineClamp) && webkitLineClamp !== 'none' && node.scrollHeight > node.clientHeight + 1
  })
}

type TruncatedTooltipProps = {
  /** The full text the cut-off name stands for. */
  label: string
  /** The element that shows the name. It becomes the tooltip trigger, so a button keeps its keyboard focus hint. */
  children: ReactElement
  side?: React.ComponentProps<typeof TooltipContent>['side']
}

/**
 * Shows the full text of a cut-off name in the shared tooltip. Nothing opens while the name fits,
 * so short names carry no hint. A name that is not interactive is reachable by pointer only;
 * the full text stays in the DOM for screen readers.
 */
export function TruncatedTooltip({ label, children, side }: TruncatedTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const clippedRef = useRef(false)

  // Measured once when the pointer enters or the element gains focus, not on every pointer move.
  const measure = () => {
    clippedRef.current = triggerRef.current !== null && isClipped(triggerRef.current)
  }

  // Radix skips its own handler when ours calls preventDefault. Refusing through a controlled `open`
  // instead would still mark the provider as warm, and the next tooltip would open with no pause.
  const openOnlyWhenClipped = (event: SyntheticEvent) => {
    if (!clippedRef.current) event.preventDefault()
  }

  return (
    <Tooltip>
      <TooltipTrigger
        asChild
        ref={triggerRef}
        onPointerEnter={measure}
        onPointerMove={openOnlyWhenClipped}
        onFocus={(event) => {
          measure()
          openOnlyWhenClipped(event)
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm break-words">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
