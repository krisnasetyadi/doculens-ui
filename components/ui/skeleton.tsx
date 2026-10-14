import { cn } from '@/lib/utils'
import { SKELETON_TONE } from '@/lib/skeleton-tones'

// Every placeholder in the app is this component, so tone and motion live here and nowhere else.
// The sweep is CSS (.skeleton-shimmer in globals.css) and is off under prefers-reduced-motion.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('skeleton-shimmer rounded-md', SKELETON_TONE.text, className)}
      {...props}
    />
  )
}

export { Skeleton }
