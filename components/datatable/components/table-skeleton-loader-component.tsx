import type { FC } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SkeletonLoaderProps {
  rows: number
  cols: number
  className?: string
  rowClassName?: string
  colClassName?: string
  skeletonClassName?: string
}

export const TableSkeletonLoader: FC<SkeletonLoaderProps> = ({
  rows,
  cols,
  className,
  rowClassName,
  colClassName,
  skeletonClassName,
}) => {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className={cn("flex gap-2", rowClassName)}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={`col-${rowIndex}-${colIndex}`}
              className={cn("flex-1", colClassName)}
            >
              <Skeleton className={cn("h-4 w-full", skeletonClassName)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
