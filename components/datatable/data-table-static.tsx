import { useCallback, useMemo, useState, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  type PaginationState,
} from "@tanstack/react-table"
import { Table } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"

import { cn } from "@/lib/utils"

import {
  DataTableHeader,
  DataTableBody,
  DataTablePagination,
  ActionCell,
} from "./components"
import { useTableState } from "./hooks"
import {
  DEFAULT_COLUMN_CONFIG,
  calculateMinColumnWidth,
  ACTION_COLUMN_WIDTH,
  SELECT_COLUMN_WIDTH,
} from "./utils"
import type { DataTableStaticProps, ColumnDef, EditingCell } from "./types"

const DEFAULT_FEATURES = {
  enableSelection: true,
  enableRowDragAndDrop: false,
  enableColumnDragAndDrop: true,
  enablePinning: true,
  enableResizing: true,
  enableColumnReorder: true,
  enableEditing: false,
  enableExpanding: false,
  enableSorting: true,
  enablePagination: true,
}

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100]

export function DataTableStatic<TData>({
  data,
  columns,
  actionItems,
  actionColumnCell,
  onTableReady,
  onSelectionChange,
  onEditValue,
  onRowOrderChange,
  subRowKey,
  identifierKey,
  features = {},
  persistence,
  pageSizes = DEFAULT_PAGE_SIZES,
  defaultPageSize = 10,
  isLoading,
  emptyState,
  className,
  rowClassName,
}: DataTableStaticProps<TData>) {
  const tableFeatures = { ...DEFAULT_FEATURES, ...features }

  const tableState = useTableState({
    persistence,
    defaultPageSize,
    onSelectionChange,
  })

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)

  const builtColumns = useMemo(() => {
    const cols: ColumnDef<TData>[] = []

    if (tableFeatures.enableSelection) {
      cols.push({
        id: "select",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: SELECT_COLUMN_WIDTH,
        minSize: SELECT_COLUMN_WIDTH,
        maxSize: SELECT_COLUMN_WIDTH,
      })
    }

    const mappedColumns = columns.map((col) => {
      if (!tableFeatures.enableResizing || col.minSize !== undefined) {
        return col
      }

      const accessorKey = "accessorKey" in col ? col.accessorKey : undefined
      const headerText =
        typeof col.header === "string"
          ? col.header
          : typeof accessorKey === "string"
            ? accessorKey
            : col.id || ""

      const calculatedMinSize = calculateMinColumnWidth(headerText, {
        enableSorting: tableFeatures.enableSorting,
        enablePinning: tableFeatures.enablePinning,
        enableColumnDragAndDrop: tableFeatures.enableColumnDragAndDrop,
        enableResizing: tableFeatures.enableResizing,
      })

      return {
        ...col,
        minSize: calculatedMinSize,
      }
    })

    cols.push(...mappedColumns)

    if (actionItems && actionItems.length > 0) {
      cols.push({
        id: "actions",
        header: "Action",
        cell: actionColumnCell
          ? ({ row }) => actionColumnCell({ row })
          : ({ row }) => (
              <ActionCell
                row={row}
                actions={actionItems}
                identifierKey={identifierKey}
              />
            ),
        enableSorting: false,
        enableHiding: false,
        enablePinning: false,
        enableResizing: false,
        size: ACTION_COLUMN_WIDTH,
        minSize: ACTION_COLUMN_WIDTH,
        maxSize: ACTION_COLUMN_WIDTH,
      })
    }

    return cols
  }, [
    columns,
    tableFeatures.enableSelection,
    tableFeatures.enableSorting,
    tableFeatures.enablePinning,
    tableFeatures.enableColumnDragAndDrop,
    tableFeatures.enableResizing,
    actionItems,
    actionColumnCell,
    identifierKey,
  ])

  // Process column order to ensure select is first and actions is last
  const processedColumnOrder = useMemo(() => {
    const storedOrder = tableState.columnOrder

    if (!storedOrder || storedOrder.length === 0) {
      return []
    }

    const userColumnOrder = storedOrder.filter(
      (col) => col !== "select" && col !== "actions"
    )

    const finalOrder: string[] = []

    if (tableFeatures.enableSelection) {
      finalOrder.push("select")
    }

    finalOrder.push(...userColumnOrder)

    if (actionItems && actionItems.length > 0) {
      finalOrder.push("actions")
    }

    return finalOrder
  }, [tableState.columnOrder, tableFeatures.enableSelection, actionItems])

  const effectiveColumnPinning = useMemo(() => {
    const basePinning = tableState.columnPinning || { left: [], right: [] }

    if (actionItems && actionItems.length > 0) {
      const rightPins = basePinning.right || []
      if (!rightPins.includes("actions")) {
        return {
          ...basePinning,
          right: [...rightPins, "actions"],
        }
      }
    }

    return basePinning
  }, [tableState.columnPinning, actionItems])

  // Create table instance
  const table = useReactTable({
    data,
    columns: builtColumns,
    state: {
      sorting: tableState.sorting,
      columnVisibility: tableState.columnVisibility,
      columnOrder: processedColumnOrder,
      columnSizing: tableState.columnSizing,
      columnPinning: effectiveColumnPinning,
      rowSelection: tableState.rowSelection,
      expanded: tableState.expanded,
      pagination: tableFeatures.enablePagination ? pagination : undefined,
    },
    onSortingChange: tableState.setSorting,
    onColumnVisibilityChange: tableState.setColumnVisibility,
    onColumnOrderChange: tableState.setColumnOrder,
    onColumnSizingChange: tableState.setColumnSizing,
    onColumnPinningChange: tableState.setColumnPinning,
    onRowSelectionChange: (updater) => {
      tableState.setRowSelection(updater, table)
    },
    onExpandedChange: tableState.setExpanded,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: tableFeatures.enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: subRowKey
      ? (row) => row[subRowKey] as TData[] | undefined
      : undefined,
    enableRowSelection: tableFeatures.enableSelection,
    enableSorting: tableFeatures.enableSorting,
    enableColumnResizing: tableFeatures.enableResizing,
    columnResizeMode: "onChange",
    defaultColumn: DEFAULT_COLUMN_CONFIG,
  })

  // Expose table instance to parent
  useEffect(() => {
    if (onTableReady) {
      onTableReady(table)
    }
  }, [table, onTableReady])

  const handleRowOrderChange = useCallback(
    (oldIndex: number, newIndex: number) => {
      if (onRowOrderChange) {
        onRowOrderChange(oldIndex, newIndex)
      }
    },
    [onRowOrderChange]
  )

  // Handle column drag and drop
  const handleColumnOrderChange = useCallback(
    (newOrder: string[]) => {
      tableState.setColumnOrder(newOrder)
    },
    [tableState]
  )

  const totalPages =
    tableFeatures.enablePagination && pagination ? table.getPageCount() : 1
  const currentPage =
    tableFeatures.enablePagination && pagination ? pagination.pageIndex + 1 : 1
  const currentPageSize =
    tableFeatures.enablePagination && pagination
      ? pagination.pageSize
      : defaultPageSize
  const selectedCount = Object.keys(tableState.rowSelection).filter(
    (key) => tableState.rowSelection[key]
  ).length
  const columnsCount = table.getVisibleFlatColumns().length

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-0", className)}>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-auto pb-4">
            <Table>
              <DataTableHeader
                table={table}
                enableRowDragAndDrop={tableFeatures.enableRowDragAndDrop}
                enableColumnDragAndDrop={tableFeatures.enableColumnDragAndDrop}
                enablePinning={tableFeatures.enablePinning}
                enableResizing={tableFeatures.enableResizing}
                enableSorting={tableFeatures.enableSorting}
                enableSelection={tableFeatures.enableSelection}
                enableExpanding={tableFeatures.enableExpanding}
                subRowKey={subRowKey}
                onColumnOrderChange={handleColumnOrderChange}
              />
              <DataTableBody
                table={table}
                enableRowDragAndDrop={tableFeatures.enableRowDragAndDrop}
                enableSelection={tableFeatures.enableSelection}
                enableExpanding={tableFeatures.enableExpanding}
                enableEditing={tableFeatures.enableEditing}
                enableAddSubRow={false}
                subRowKey={subRowKey}
                identifierKey={identifierKey}
                editingCell={editingCell}
                onEditingCellChange={setEditingCell}
                onEditValue={onEditValue}
                onRowOrderChange={handleRowOrderChange}
                emptyState={emptyState}
                columnsCount={columnsCount}
                rowClassName={rowClassName}
              />
            </Table>
          </div>
        )}

        {tableFeatures.enablePagination && !isLoading && data.length > 0 && (
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={currentPageSize}
            totalItems={table.getFilteredRowModel().rows.length}
            visibleItems={table.getRowModel().rows.length}
            pageSizes={pageSizes}
            onPageChange={(page: number) =>
              setPagination((prev) => ({ ...prev, pageIndex: page - 1 }))
            }
            onPageSizeChange={(size: number) =>
              setPagination({ pageIndex: 0, pageSize: size })
            }
            selectedCount={selectedCount}
            showSelectedCount={tableFeatures.enableSelection}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
