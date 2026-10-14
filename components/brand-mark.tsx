import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** The DocuLens logo tile. Place it inside a `group` (a link) and the ring grows on hover. */
const brandMarkVariants = cva(
  'grid shrink-0 place-items-center rounded-xl bg-primary text-white shadow-[0_0_0_4px_rgba(74,124,255,0.15)] transition-shadow group-hover:shadow-[0_0_0_6px_rgba(74,124,255,0.2)]',
  {
    variants: {
      size: {
        sm: 'size-7 text-base',
        md: 'size-9 text-xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

function BrandMark({ size, className }: VariantProps<typeof brandMarkVariants> & { className?: string }) {
  return (
    <span aria-hidden="true" className={cn(brandMarkVariants({ size }), className)}>
      <span className="material-symbols-outlined leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
        hub
      </span>
    </span>
  )
}

export { BrandMark }
