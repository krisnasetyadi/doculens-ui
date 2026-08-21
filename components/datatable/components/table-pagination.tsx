import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { cn } from "@/lib/utils"
import { getPageNumbers } from "../utils"

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  visibleItems: number
  pageSizes?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  selectedCount?: number
  showSelectedCount?: boolean
  className?: string
}

interface PageButtonProps {
  page: number | "..."
  currentPage: number
  onClick: (page: number) => void
}

function PageButton({ page, currentPage, onClick }: PageButtonProps) {
  if (page === "...") {
    return (
      <span className="px-2 py-2 text-base leading-5 text-muted-foreground">
        ...
      </span>
    )
  }

  const isActive = page === currentPage

  return (
    <button
      type="button"
      onClick={() => onClick(page)}
      className={cn(
        "h-9 min-w-[39px] rounded border px-4 py-2",
        "text-base leading-5 font-normal",
        "cursor-pointer transition-colors",
        isActive
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {page}
    </button>
  )
}

export function DataTablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  visibleItems: _visibleItems,
  pageSizes = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  selectedCount = 0,
  showSelectedCount = true,
  className,
}: TablePaginationProps) {
  const pageNumbers = getPageNumbers(totalPages, currentPage)

  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <div
      className={cn(
        "flex h-[60px] items-center justify-between p-3",
        "bg-background",
        className
      )}
    >
      {/* Left side - Dropdown and entries info */}
      <div className="flex h-9 items-center gap-4">
        {showSelectedCount && selectedCount > 0 && (
          <span className="text-base leading-5 font-medium text-primary">
            {selectedCount} selected
          </span>
        )}
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-9 w-[90px] rounded border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-base leading-5 font-normal text-foreground">
          {_visibleItems} of {totalItems} entries
        </span>
      </div>

      {/* Right side - Pagination controls */}
      <div className="flex h-9 items-center gap-6">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className={cn(
            "flex h-5 items-center gap-1",
            "text-base leading-5 font-normal",
            canGoPrevious
              ? "cursor-pointer text-muted-foreground hover:text-foreground"
              : "cursor-not-allowed text-muted-foreground/50"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Previous</span>
        </button>

        {/* Page number buttons */}
        <div className="flex items-center gap-2">
          {pageNumbers.map((page, index) => (
            <PageButton
              key={`${page}-${index}`}
              page={page}
              currentPage={currentPage}
              onClick={onPageChange}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={cn(
            "flex h-5 items-center gap-1",
            "text-base leading-5 font-normal",
            canGoNext
              ? "cursor-pointer text-muted-foreground hover:text-foreground"
              : "cursor-not-allowed text-muted-foreground/50"
          )}
        >
          <span>Next</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

interface CompactPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function CompactPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: CompactPaginationProps) {
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
      >
        Next
      </Button>
    </div>
  )
}
