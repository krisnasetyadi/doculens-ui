import type { CSSProperties } from "react"
import type { Column, Header, Table } from "@tanstack/react-table"

export const FIXED_WIDTH_COLUMNS = ["select", "actions"] as const
export const ACTION_COLUMN_WIDTH = 80
export const SELECT_COLUMN_WIDTH = 44

export function isFixedWidthColumn(columnId: string): boolean {
  return FIXED_WIDTH_COLUMNS.includes(columnId as any)
}

export function getFixedColumnWidth(columnId: string): number | undefined {
  if (columnId === "actions") return ACTION_COLUMN_WIDTH
  if (columnId === "select") return SELECT_COLUMN_WIDTH
  return undefined
}

export function getPinningStyles<TData>(
  column: Column<TData>,
  _options?: { backgroundColor?: string }
): CSSProperties {
  const isPinned = column.getIsPinned()
  const isLastLeftPinnedColumn =
    isPinned === "left" && column.getIsLastColumn("left")
  const isFirstRightPinnedColumn =
    isPinned === "right" && column.getIsFirstColumn("right")

  const columnId = column.id
  const isFixed = isFixedWidthColumn(columnId)
  const fixedWidth = getFixedColumnWidth(columnId)

  if (isFixed && fixedWidth) {
    const fixedStyles: CSSProperties = {
      width: fixedWidth,
      minWidth: fixedWidth,
      maxWidth: fixedWidth,
      flexShrink: 0,
      flexGrow: 0,
    }

    if (isPinned) {
      return {
        ...fixedStyles,
        boxShadow: isLastLeftPinnedColumn
          ? "4px 0 4px -4px rgba(0, 0, 0, 0.15)"
          : isFirstRightPinnedColumn
            ? "inset 1px 0 0 0 #a3a3a3, -4px 0 4px -4px rgba(0, 0, 0, 0.15)"
            : undefined,
        left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
        right:
          isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
        position: "sticky",
        zIndex: 1,
      }
    }

    return { ...fixedStyles, position: "relative" }
  }

  const baseStyles: CSSProperties = {
    width: column.getSize(),
    minWidth: 80,
  }

  if (!isPinned) {
    return { ...baseStyles, position: "relative" }
  }

  return {
    ...baseStyles,
    boxShadow: isLastLeftPinnedColumn
      ? "4px 0 4px -4px rgba(0, 0, 0, 0.15)"
      : isFirstRightPinnedColumn
        ? "inset 1px 0 0 0 #a3a3a3, -4px 0 4px -4px rgba(0, 0, 0, 0.15)"
        : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: "sticky",
    zIndex: 1,
  }
}

export function getPageNumbers(
  totalPages: number,
  currentPage: number,
  maxVisible = 5
): (number | "...")[] {
  const pages: (number | "...")[] = []

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
    return pages
  }

  pages.push(1)

  let startPage = Math.max(2, currentPage - 1)
  let endPage = Math.min(totalPages - 1, currentPage + 1)

  if (currentPage <= 3) {
    endPage = Math.min(4, totalPages - 1)
  }

  if (currentPage >= totalPages - 2) {
    startPage = Math.max(2, totalPages - 3)
  }

  if (startPage > 2) {
    pages.push("...")
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  if (endPage < totalPages - 1) {
    pages.push("...")
  }

  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

function calculateTotalColumns<TData>(
  headers: Header<TData, unknown>[]
): number {
  return headers.reduce((acc, header) => {
    if (header.subHeaders && header.subHeaders.length > 0) {
      return acc + calculateTotalColumns(header.subHeaders)
    }
    return acc + (header.isPlaceholder ? 0 : 1)
  }, 0)
}

export function getTotalColumnsCount<TData>(table: Table<TData>): number {
  const headerGroups = table.getHeaderGroups()
  if (!headerGroups.length) return 0

  const lastHeaderGroup = headerGroups[headerGroups.length - 1]
  return calculateTotalColumns(lastHeaderGroup.headers)
}

export function getVisibleColumnsCount<TData>(
  table: Table<TData>,
  excludeIds: string[] = ["select", "actions"]
): number {
  return table
    .getVisibleFlatColumns()
    .filter((col) => !excludeIds.includes(col.id)).length
}

export function getValueByPath(obj: any, path: string): any {
  if (!path) return undefined

  return path.split(".").reduce((acc, part) => {
    if (!acc) return undefined

    if (part.endsWith("[]")) {
      const key = part.replace("[]", "")
      const array = acc[key]

      return Array.isArray(array)
        ? array.map((item: any) =>
            getValueByPath(
              item,
              path
                .split(".")
                .slice(path.indexOf(part) + 1)
                .join(".")
            )
          )
        : []
    }

    return acc[part]
  }, obj)
}

export function flattenSubRows<TData extends { subRows?: TData[] }>(
  rows: TData[],
  subKey: keyof TData = "subRows" as keyof TData
): TData[] {
  const result: TData[] = []

  rows.forEach((row) => {
    result.push(row)
    const subRows = row[subKey] as TData[] | undefined
    if (Array.isArray(subRows) && subRows.length > 0) {
      result.push(...flattenSubRows(subRows, subKey))
    }
  })

  return result
}

export async function copyToClipboard(
  text: string | string[],
  options?: {
    onSuccess?: () => void
    onError?: (error: Error) => void
  }
): Promise<boolean> {
  const textToCopy = Array.isArray(text) ? text.join(" ") : text

  try {
    await navigator.clipboard.writeText(textToCopy)
    options?.onSuccess?.()
    return true
  } catch (error) {
    options?.onError?.(error as Error)
    return false
  }
}

export function reorderColumns(
  columnOrder: string[],
  sourceIndex: number,
  destinationIndex: number
): string[] {
  const newOrder = [...columnOrder]
  const [removed] = newOrder.splice(sourceIndex, 1)
  newOrder.splice(destinationIndex, 0, removed)
  return newOrder
}

export function getResizeHandleStyles(isResizing: boolean): CSSProperties {
  return {
    position: "absolute",
    right: 0,
    top: 0,
    height: "100%",
    width: "4px",
    cursor: "col-resize",
    userSelect: "none",
    touchAction: "none",
    backgroundColor: isResizing ? "var(--primary)" : "transparent",
  }
}

const HEADER_ICON_SIZES = {
  dragHandle: 16,
  sortIcon: 16,
  pinIcon: 16,
  menuIcon: 12,
  resizeHandle: 4,
  iconGap: 8,
  cellPadding: 16,
  textPadding: 8,
} as const

const CHAR_WIDTH_PX = 8

/**
 * Calculate minimum column width based on header content and enabled features
 * @param headerText - The header text to display
 * @param options - Features enabled for this column
 * @returns Minimum width in pixels
 */
export function calculateMinColumnWidth(
  headerText: string,
  options: {
    enableSorting?: boolean
    enablePinning?: boolean
    enableColumnDragAndDrop?: boolean
    hasHeaderActions?: boolean
    enableResizing?: boolean
  } = {}
): number {
  const {
    enableSorting = true,
    enablePinning = true,
    enableColumnDragAndDrop = true,
    hasHeaderActions = false,
    enableResizing = true,
  } = options

  const textWidth =
    headerText.length * CHAR_WIDTH_PX + HEADER_ICON_SIZES.textPadding

  let iconsWidth = 0

  if (enableColumnDragAndDrop) {
    iconsWidth += HEADER_ICON_SIZES.dragHandle + HEADER_ICON_SIZES.iconGap
  }

  if (enableSorting) {
    iconsWidth += HEADER_ICON_SIZES.sortIcon + HEADER_ICON_SIZES.iconGap
  }

  if (enablePinning || hasHeaderActions) {
    iconsWidth += HEADER_ICON_SIZES.menuIcon + HEADER_ICON_SIZES.iconGap
  }

  if (enableResizing) {
    iconsWidth += HEADER_ICON_SIZES.resizeHandle
  }

  const minWidth = textWidth + iconsWidth + HEADER_ICON_SIZES.cellPadding

  return Math.max(minWidth, DEFAULT_MIN_COLUMN_SIZE)
}

/**
 * Calculate minimum column width based on data values
 * Use this when you want to consider the longest value in the column
 * @param values - Array of string values in the column
 * @param headerText - The header text
 * @param options - Features enabled for this column
 * @returns Minimum width in pixels
 */
export function calculateMinColumnWidthFromData(
  values: string[],
  headerText: string,
  options: {
    enableSorting?: boolean
    enablePinning?: boolean
    enableColumnDragAndDrop?: boolean
    hasHeaderActions?: boolean
    enableResizing?: boolean
    maxValueLength?: number
  } = {}
): number {
  const { maxValueLength = 30, ...headerOptions } = options

  const longestValue = values.reduce((max, val) => {
    const strVal = String(val || "")
    return strVal.length > max.length ? strVal : max
  }, "")

  const cappedValue = longestValue.slice(0, maxValueLength)

  const headerMinWidth = calculateMinColumnWidth(headerText, headerOptions)

  const valueMinWidth =
    cappedValue.length * CHAR_WIDTH_PX + HEADER_ICON_SIZES.cellPadding

  return Math.max(headerMinWidth, valueMinWidth)
}

const DEFAULT_MIN_COLUMN_SIZE = 120
const DEFAULT_MAX_COLUMN_SIZE = 500
const DEFAULT_COLUMN_SIZE = 150

export const DEFAULT_COLUMN_CONFIG = {
  size: DEFAULT_COLUMN_SIZE,
  minSize: DEFAULT_MIN_COLUMN_SIZE,
  maxSize: DEFAULT_MAX_COLUMN_SIZE,
  enableHiding: true,
} as const

export const SYSTEM_COLUMN_IDS = ["select", "actions", "drag-handle"] as const

export function getRowClassName(
  isSelected: boolean,
  depth: number,
  isDragging?: boolean
): string {
  const classes: string[] = []

  if (isSelected) {
    classes.push("bg-accent")
  }

  if (depth > 0) {
    classes.push("bg-muted")
  }

  if (isDragging) {
    classes.push("opacity-50")
  }

  return classes.join(" ")
}

export function getCellClassName(
  isPinned: boolean | string,
  isEditing?: boolean
): string {
  const classes: string[] = ["align-middle"]

  if (isPinned) {
    classes.push("bg-inherit")
  }

  if (isEditing) {
    classes.push("p-0")
  }

  return classes.join(" ")
}
