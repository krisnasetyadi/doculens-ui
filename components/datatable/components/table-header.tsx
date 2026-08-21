import {
  type CSSProperties,
  type ReactNode,
  useRef,
  useState,
  useCallback,
} from "react"
import { flexRender, type Table, type Header } from "@tanstack/react-table"
import {
  Pin,
  ChevronsDown,
  ChevronsRight,
  GripVertical,
  MoreHorizontal,
  ChevronsLeftRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  TableHead,
  TableHeader as TableHeaderPrimitive,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"
import { getPinningStyles } from "../utils"

interface TableHeaderProps<TData> {
  table: Table<TData>
  enableRowDragAndDrop?: boolean
  enableColumnDragAndDrop?: boolean
  enablePinning?: boolean
  enableResizing?: boolean
  enableSorting?: boolean
  enableSelection?: boolean
  enableExpanding?: boolean
  subRowKey?: keyof TData
  headerActions?: (columnId: string) => ReactNode
  onColumnOrderChange?: (newOrder: string[]) => void
}

interface SelectionHeaderCellProps<TData> {
  table: Table<TData>
  enableRowDragAndDrop?: boolean
  enableExpanding?: boolean
}

function SelectionHeaderCell<TData>({
  table,
  enableRowDragAndDrop,
  enableExpanding,
}: SelectionHeaderCellProps<TData>) {
  const isAllSelected = table.getIsAllPageRowsSelected()
  const isSomeSelected = table.getIsSomePageRowsSelected()

  return (
    <div className="flex items-center justify-center gap-2">
      {enableRowDragAndDrop && (
        <div className="cursor-not-allowed text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <Checkbox
        checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="cursor-pointer"
      />
      {enableExpanding && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={table.getToggleAllRowsExpandedHandler()}
          className="h-6 w-6 p-0"
        >
          {table.getIsAllRowsExpanded() ? (
            <ChevronsDown className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

interface SortableHeaderCellContentProps<TData> {
  header: Header<TData, unknown>
  enableSorting?: boolean
  enablePinning?: boolean
  enableColumnDragAndDrop?: boolean
  dragAttributes?: any
  dragListeners?: any
  headerActions?: ReactNode
  resizeHandle?: ReactNode
}

function SortableHeaderCellContent<TData>({
  header,
  enableSorting,
  enablePinning,
  enableColumnDragAndDrop,
  dragAttributes,
  dragListeners,
  headerActions,
  resizeHandle,
}: SortableHeaderCellContentProps<TData>) {
  const column = header.column
  const canSort = enableSorting && column.getCanSort()
  const isPinned = column.getIsPinned()
  const sortDirection = column.getIsSorted()
  const canDragColumn =
    enableColumnDragAndDrop &&
    (column.columnDef.meta as { enableColumnDragAndDrop?: boolean } | undefined)
      ?.enableColumnDragAndDrop !== false

  // Special handling for number order column
  const isNumOrderColumn = column.id === "no"
  const showPinMenu = enablePinning && column.getCanPin() && !isNumOrderColumn

  const renderSortIcon = () => {
    if (!sortDirection) return <ArrowUpDown className="h-4 w-4 text-foreground" />
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-foreground" />
    ) : (
      <ArrowDown className="h-4 w-4 text-foreground" />
    )
  }

  const handleSort = () => {
    if (!canSort) return
    if (!sortDirection) {
      column.toggleSorting(false)
    } else if (sortDirection === "asc") {
      column.toggleSorting(true)
    } else {
      column.clearSorting()
    }
  }

  return (
    <div
      className={cn(
        isNumOrderColumn
          ? "mx-auto justify-center"
          : "group flex w-full min-w-0 items-center gap-0.5 pr-6"
      )}
    >
      {canDragColumn && !isNumOrderColumn && (
        <div
          className="flex shrink-0 cursor-grab items-center text-muted-foreground transition-opacity hover:text-foreground"
          {...dragAttributes}
          {...dragListeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <div className="flex h-8 min-w-0 flex-1 items-center gap-1 px-1.5">
        <TruncatedHeaderTitle
          titleStr={
            typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : undefined
          }
        >
          {flexRender(column.columnDef.header, header.getContext())}
        </TruncatedHeaderTitle>
        {isPinned && (
          <Pin className="ml-1 h-3 w-3 shrink-0 fill-primary text-primary" />
        )}
      </div>

      {!isNumOrderColumn && (
        <div className="flex shrink-0 items-center gap-0">
          {(showPinMenu || headerActions) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10 h-6 w-6 p-0 hover:bg-accent"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-50 min-w-[140px]">
                {showPinMenu &&
                  (isPinned ? (
                    <DropdownMenuItem
                      onClick={() => column.pin(false)}
                      className="cursor-pointer"
                    >
                      <Pin className="mr-2 h-4 w-4" />
                      Unpin Column
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => column.pin("left")}
                      className="cursor-pointer"
                    >
                      <Pin className="mr-2 h-4 w-4" />
                      Pin to Left
                    </DropdownMenuItem>
                  ))}
                {enablePinning && headerActions && <DropdownMenuSeparator />}
                {headerActions}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {resizeHandle}

          {canSort && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSort}
              className="h-6 w-6 p-0 hover:bg-accent"
            >
              {renderSortIcon()}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface ResizeHandleProps<TData> {
  header: Header<TData, unknown>
  table: Table<TData>
  tableRef?: React.RefObject<HTMLTableElement>
}

function ResizeHandle<TData>({
  header,
  table,
  tableRef,
}: ResizeHandleProps<TData>) {
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const nextColumnStartWidthRef = useRef(0)
  const tableWidthRef = useRef(0)

  const columnId = header.column.id
  const minWidthPercent = 3 // Minimum column width as percentage of table width

  const getNextResizableColumn = useCallback(() => {
    const allColumns = table.getAllLeafColumns()
    const currentIndex = allColumns.findIndex((col) => col.id === columnId)

    for (let i = currentIndex + 1; i < allColumns.length; i++) {
      const col = allColumns[i]

      if (col.id === "select" || col.id === "actions") continue

      if (!col.getCanResize()) continue
      return col
    }
    return null
  }, [table, columnId])

  const getTableElement = useCallback((): HTMLTableElement | null => {
    if (tableRef?.current) return tableRef.current

    const headerElement = document.querySelector(
      `[data-column-id="${columnId}"]`
    )
    return headerElement?.closest("table") ?? null
  }, [tableRef, columnId])

  const pixelToPercent = useCallback(
    (pixels: number, tableWidth: number): number => {
      return (pixels / tableWidth) * 100
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const nextColumn = getNextResizableColumn()
      const tableElement = getTableElement()
      const tableWidth = tableElement?.offsetWidth ?? 1000

      setIsResizing(true)
      startXRef.current = e.clientX
      tableWidthRef.current = tableWidth

      startWidthRef.current = header.getSize()
      nextColumnStartWidthRef.current = nextColumn?.getSize() ?? 0

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current
        const currentTableWidth = tableWidthRef.current

        const newWidthPx = Math.max(
          (minWidthPercent / 100) * currentTableWidth,
          startWidthRef.current + delta
        )

        const currentSizing = table.getState().columnSizing
        const newSizing: Record<string, number> = {
          ...currentSizing,
          [columnId]: newWidthPx,
        }

        table.setColumnSizing(newSizing)
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [
      header,
      table,
      columnId,
      minWidthPercent,

      getNextResizableColumn,
      getTableElement,
      pixelToPercent,
    ]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const nextColumn = getNextResizableColumn()
      const tableElement = getTableElement()
      const tableWidth = tableElement?.offsetWidth ?? 1000

      setIsResizing(true)
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      tableWidthRef.current = tableWidth
      startWidthRef.current = header.getSize()
      nextColumnStartWidthRef.current = nextColumn?.getSize() ?? 0

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const touch = moveEvent.touches[0]
        const delta = touch.clientX - startXRef.current
        const currentTableWidth = tableWidthRef.current

        const newWidthPx = Math.max(
          (minWidthPercent / 100) * currentTableWidth,
          startWidthRef.current + delta
        )
        const actualDelta = newWidthPx - startWidthRef.current

        const currentSizing = table.getState().columnSizing
        const newSizing: Record<string, number> = {
          ...currentSizing,
          [columnId]: newWidthPx,
        }

        const nextColumn = getNextResizableColumn()
        if (nextColumn && nextColumnStartWidthRef.current > 0) {
          const nextMinWidthPx = (minWidthPercent / 100) * currentTableWidth
          const nextNewWidthPx = Math.max(
            nextMinWidthPx,
            nextColumnStartWidthRef.current - actualDelta
          )

          if (nextNewWidthPx >= nextMinWidthPx) {
            newSizing[nextColumn.id] = nextNewWidthPx
          } else {
            const maxDelta = nextColumnStartWidthRef.current - nextMinWidthPx
            const clampedWidthPx = startWidthRef.current + maxDelta
            newSizing[columnId] = clampedWidthPx
            newSizing[nextColumn.id] = nextMinWidthPx
          }
        }

        table.setColumnSizing(newSizing)
      }

      const handleTouchEnd = () => {
        setIsResizing(false)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)
      }

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      })
      document.addEventListener("touchend", handleTouchEnd)
    },
    [
      header,
      table,
      columnId,
      minWidthPercent,
      getNextResizableColumn,
      getTableElement,
      pixelToPercent,
    ]
  )

  const handleDoubleClick = useCallback(() => {
    header.column.resetSize()
  }, [header])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={cn(
        "h-6 w-6 p-0 hover:bg-accent",
        "cursor-col-resize touch-none select-none",
        isResizing && "bg-accent"
      )}
    >
      <ChevronsLeftRight className="pointer-events-none h-4 w-4 text-foreground" />
    </Button>
  )
}
interface DraggableHeaderCellProps<TData> {
  header: Header<TData, unknown>
  table: Table<TData>
  enableSorting?: boolean
  enablePinning?: boolean
  enableResizing?: boolean
  enableSelection?: boolean
  enableColumnDragAndDrop?: boolean
  enableRowDragAndDrop?: boolean
  enableExpanding?: boolean
  subRowKey?: keyof TData
  headerActions?: (columnId: string) => ReactNode
  onColumnResize?: (columnId: string, width: number) => void
}

function DraggableHeaderCell<TData>({
  header,
  table,
  enableSorting,
  enablePinning,
  enableResizing,
  enableSelection,
  enableColumnDragAndDrop,
  enableRowDragAndDrop,
  enableExpanding,
  subRowKey,
  headerActions,
}: DraggableHeaderCellProps<TData>) {
  const column = header.column
  const isPinned = column.getIsPinned()
  const isSelectColumn = column.id === "select"
  const isActionsColumn = column.id === "actions"
  const isSystemColumn = isSelectColumn || isActionsColumn
  const isColumnDragDisabled =
    (column.columnDef.meta as { enableColumnDragAndDrop?: boolean } | undefined)
      ?.enableColumnDragAndDrop === false

  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useSortable({
      id: column.id,
      disabled: isSystemColumn || isColumnDragDisabled,
    })

  const style: CSSProperties = {
    ...getPinningStyles(column),
    opacity: isDragging ? 0.8 : 1,
    position: isPinned ? "sticky" : "relative",
    transform: CSS.Translate.toString(transform),
    transition: "width transform 0.2s ease-in-out",
    whiteSpace: "nowrap",
    width: header.getSize(),
    zIndex: isDragging ? 1000 : isPinned ? 1 : 0,
  }

  return (
    <TableHead
      ref={setNodeRef}
      colSpan={header.colSpan}
      style={style}
      className={cn(
        "group relative h-11 border-y border-border bg-muted px-2 py-3 whitespace-nowrap",
        "text-sm font-bold text-foreground",
        isPinned && "bg-muted",
        isDragging && "shadow-lg ring-2 ring-ring"
      )}
    >
      {header.isPlaceholder ? null : (
        <div
          className={cn(
            "flex items-center gap-3",
            isSelectColumn && "justify-center"
          )}
        >
          {isSelectColumn && enableSelection ? (
            <SelectionHeaderCell
              table={table}
              enableRowDragAndDrop={enableRowDragAndDrop}
              enableExpanding={enableExpanding && !!subRowKey}
            />
          ) : isActionsColumn ? (
            <div className="flex w-full items-center justify-center">
              <span className="text-sm font-bold text-foreground">
                {flexRender(column.columnDef.header, header.getContext())}
              </span>
            </div>
          ) : (
            <SortableHeaderCellContent
              header={header}
              enableSorting={enableSorting && column.getCanSort()}
              enablePinning={enablePinning}
              enableColumnDragAndDrop={enableColumnDragAndDrop}
              dragAttributes={attributes}
              dragListeners={listeners}
              headerActions={headerActions && headerActions(column.id)}
              resizeHandle={
                enableResizing && !isSystemColumn && column.getCanResize() ? (
                  <ResizeHandle header={header} table={table} />
                ) : null
              }
            />
          )}
        </div>
      )}
    </TableHead>
  )
}

export function DataTableHeader<TData>({
  table,
  enableRowDragAndDrop = false,
  enableColumnDragAndDrop = false,
  enablePinning = false,
  enableResizing = false,
  enableSorting = false,
  enableSelection = true,
  enableExpanding = false,
  subRowKey,
  headerActions,
  onColumnOrderChange,
}: TableHeaderProps<TData>) {
  const columnOrder =
    table.getState().columnOrder.length > 0
      ? table.getState().columnOrder
      : table.getAllColumns().map((col) => col.id)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string)
      const newIndex = columnOrder.indexOf(over.id as string)
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex)

      if (onColumnOrderChange) {
        onColumnOrderChange(newOrder)
      } else {
        table.setColumnOrder(newOrder)
      }
    }
  }

  const renderHeaderContent = () => (
    <>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="border-0">
          {enableColumnDragAndDrop ? (
            <SortableContext
              items={columnOrder}
              strategy={horizontalListSortingStrategy}
            >
              {headerGroup.headers.map((header) => (
                <DraggableHeaderCell
                  key={header.id}
                  header={header}
                  table={table}
                  enableSorting={enableSorting}
                  enablePinning={enablePinning}
                  enableResizing={enableResizing}
                  enableSelection={enableSelection}
                  enableColumnDragAndDrop={enableColumnDragAndDrop}
                  enableRowDragAndDrop={enableRowDragAndDrop}
                  enableExpanding={enableExpanding}
                  subRowKey={subRowKey}
                  headerActions={headerActions}
                />
              ))}
            </SortableContext>
          ) : (
            headerGroup.headers.map((header) => {
              const column = header.column
              const isPinned = column.getIsPinned()
              const isSelectColumn = column.id === "select"
              const isActionsColumn = column.id === "actions"
              const isSystemColumn = isSelectColumn || isActionsColumn

              return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{
                    position: "sticky",
                    top: 0,
                    ...getPinningStyles(column),
                    width: header.getSize(),
                  }}
                  className={cn(
                    "relative h-11 border-y border-border px-2 py-3 whitespace-nowrap",
                    "bg-muted text-sm font-bold text-foreground",
                    isPinned && "bg-muted"
                  )}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={cn(
                        "flex items-center gap-3",
                        isSelectColumn && "justify-center"
                      )}
                    >
                      {isSelectColumn && enableSelection ? (
                        <SelectionHeaderCell
                          table={table}
                          enableRowDragAndDrop={enableRowDragAndDrop}
                          enableExpanding={enableExpanding && !!subRowKey}
                        />
                      ) : isActionsColumn ? (
                        <div className="flex w-full items-center justify-center">
                          <span className="text-sm font-bold text-foreground">
                            {flexRender(
                              column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                        </div>
                      ) : (
                        <SortableHeaderCellContent
                          header={header}
                          enableSorting={enableSorting && column.getCanSort()}
                          enablePinning={enablePinning}
                          enableColumnDragAndDrop={false}
                          resizeHandle={
                            enableResizing &&
                            !isSystemColumn &&
                            column.getCanResize() ? (
                              <ResizeHandle header={header} table={table} />
                            ) : null
                          }
                        />
                      )}

                      {headerActions &&
                        !isSystemColumn &&
                        headerActions(column.id)}
                    </div>
                  )}
                </TableHead>
              )
            })
          )}
        </TableRow>
      ))}
    </>
  )

  if (enableColumnDragAndDrop) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        accessibility={{
          container: typeof document !== "undefined" ? document.body : undefined,
          restoreFocus: false,
        }}
      >
        <TableHeaderPrimitive className="bg-muted">
          {renderHeaderContent()}
        </TableHeaderPrimitive>
      </DndContext>
    )
  }

  return (
    <TableHeaderPrimitive className="bg-muted">
      {renderHeaderContent()}
    </TableHeaderPrimitive>
  )
}

export {
  SelectionHeaderCell,
  SortableHeaderCellContent as SortableHeaderCell,
  ResizeHandle,
}

function TruncatedHeaderTitle({
  children,
  titleStr,
}: {
  children: ReactNode
  titleStr?: string
}) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open && textRef.current) {
      const isTruncated =
        textRef.current.scrollWidth > textRef.current.clientWidth
      if (isTruncated) {
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    } else {
      setIsOpen(false)
    }
  }

  const content = (
    <span
      ref={textRef}
      className="block w-full cursor-default truncate text-sm font-bold text-foreground"
    >
      {children}
    </span>
  )

  if (!titleStr) {
    return content
  }

  return (
    <Tooltip open={isOpen} onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>
        <p>{titleStr}</p>
      </TooltipContent>
    </Tooltip>
  )
}
