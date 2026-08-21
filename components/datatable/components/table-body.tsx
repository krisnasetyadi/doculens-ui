import {
  type ReactNode,
  type CSSProperties,
  useState,
  useCallback,
  useMemo,
} from "react"
import {
  flexRender,
  type Table,
  type Row,
  type Cell,
} from "@tanstack/react-table"
import { GripVertical, ChevronDown, ChevronRight, Plus, Inbox } from "lucide-react"

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  TableBody as TableBodyPrimitive,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

import { cn } from "@/lib/utils"
import { getPinningStyles, getRowClassName } from "../utils"
import type { EditingCell, ColumnDef } from "../types"
import { EditableCell, CellDataType } from "./editable-cell"

/**
 * Default empty state component.
 * Used when emptyState prop is a string or undefined.
 */
export const DefaultEmptyState = ({ message }: { message?: string }) => {
  const emptyMessage = message || "No data available yet."

  return (
    <div className="flex h-[236px] flex-col items-center justify-center gap-3 rounded border border-border bg-background p-5">
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <div className="space-y-1 text-center">
        <p className="text-lg font-bold text-foreground">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground">No available data</p>
      </div>
    </div>
  )
}

interface TableBodyProps<TData> {
  table: Table<TData>
  enableRowDragAndDrop?: boolean
  enableSelection?: boolean
  enableExpanding?: boolean
  enableEditing?: boolean
  enableAddSubRow?: boolean
  subRowKey?: keyof TData
  identifierKey?: keyof TData
  editingCell: EditingCell | null
  onEditingCellChange: (cell: EditingCell | null) => void
  onEditValue?: (
    value: any,
    id: any,
    callback: () => void,
    row?: Row<TData>
  ) => void
  onRowOrderChange?: (oldIndex: number, newIndex: number) => void
  onAddSubRow?: (row: Row<TData>) => void
  emptyState?: string | ReactNode
  columnsCount: number
  rowClassName?: (row: TData) => string
  // Foreign key support
  onForeignKeySearch?: (
    referenceTable: string,
    search: string,
    callback: (options: { label: string; value: string | number }[]) => void
  ) => void
}

interface SelectionCellProps<TData> {
  row: Row<TData>
  enableRowDragAndDrop?: boolean
  enableExpanding?: boolean
  enableAddSubRow?: boolean
  subRowKey?: keyof TData
  onAddSubRow?: (row: Row<TData>) => void
  dragAttributes?: React.HTMLAttributes<HTMLButtonElement>
  dragListeners?: React.DOMAttributes<HTMLButtonElement>
}

function SelectionCell<TData>({
  row,
  enableRowDragAndDrop,
  enableExpanding,
  enableAddSubRow,
  subRowKey,
  onAddSubRow,
  dragAttributes,
  dragListeners,
}: SelectionCellProps<TData>) {
  const hasSubRows = subRowKey && row.subRows && row.subRows.length > 0
  const depth = row.depth

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2",
        depth > 0 && "pl-4"
      )}
    >
      {enableRowDragAndDrop && (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...dragAttributes}
          {...dragListeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="cursor-pointer"
      />

      {enableExpanding && hasSubRows && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => row.toggleExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      )}

      {enableAddSubRow && depth === 0 && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-primary hover:text-primary"
          onClick={() => onAddSubRow?.(row)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

interface EditableCellWrapperProps<TData> {
  cell: Cell<TData, unknown>
  row: Row<TData>
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (value: any) => void
  identifierKey?: keyof TData
  // Foreign key support
  onForeignKeySearch?: (
    referenceTable: string,
    search: string,
    callback: (options: { label: string; value: string | number }[]) => void
  ) => void
}

function EditableCellWrapper<TData>({
  cell,
  row: _row,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  identifierKey: _identifierKey,
  onForeignKeySearch,
}: EditableCellWrapperProps<TData>) {
  const column = cell.column.columnDef as ColumnDef<TData>
  // Default to NOT editable - must explicitly set editable: true
  const isEditable = column.editable === true
  const value = cell.getValue()

  // State for foreign key options
  const [foreignKeyOptions, setForeignKeyOptions] = useState<
    { label: string; value: string | number }[]
  >([])

  // Determine the data type from column definition
  const getDataType = (): CellDataType => {
    const type = column.type

    if (typeof type === "number") return type as CellDataType
    if (type === "text" || type === "string") return CellDataType.TEXT
    if (type === "int" || type === "integer") return CellDataType.INT
    if (type === "number" || type === "fraction" || type === "decimal")
      return CellDataType.FRACTION
    if (type === "date" || type === "datetime" || type === "range")
      return CellDataType.DATETIME
    if (type === "boolean" || type === "bool") return CellDataType.BOOLEAN
    if (type === "foreign_key" || type === "foreignKey")
      return CellDataType.FOREIGN_KEY
    if (type === "multiselect") return CellDataType.MULTISELECT
    return CellDataType.TEXT
  }

  const handleForeignKeySearch = useCallback(
    (search: string) => {
      if (onForeignKeySearch && column.referenceTable) {
        onForeignKeySearch(column.referenceTable, search, (options) => {
          setForeignKeyOptions(options)
        })
      }
    },
    [onForeignKeySearch, column.referenceTable]
  )

  if (isEditing && isEditable) {
    return (
      <EditableCell
        isEditing={isEditing}
        value={value}
        dataType={getDataType()}
        attribute={column.attribute || cell.column.id}
        referenceTable={column.referenceTable}
        onSave={onSave}
        onCancelEdit={onCancelEdit}
        foreignKeyOptions={foreignKeyOptions}
        onForeignKeySearch={handleForeignKeySearch}
        multiselectOptions={column.options || []}
      />
    )
  }

  return (
    <div
      className={cn(
        "min-h-[32px] rounded px-2 py-1",
        isEditable && "cursor-pointer hover:bg-muted"
      )}
      onDoubleClick={isEditable ? onStartEdit : undefined}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </div>
  )
}

interface DataTableRowProps<TData> {
  row: Row<TData>
  enableRowDragAndDrop?: boolean
  enableSelection?: boolean
  enableExpanding?: boolean
  enableEditing?: boolean
  enableAddSubRow?: boolean
  subRowKey?: keyof TData
  identifierKey?: keyof TData
  editingCell: EditingCell | null
  onEditingCellChange: (cell: EditingCell | null) => void
  onEditValue?: (
    value: any,
    id: any,
    callback: () => void,
    row?: Row<TData>
  ) => void
  onAddSubRow?: (row: Row<TData>) => void
  rowClassName?: (row: TData) => string
  // Foreign key support
  onForeignKeySearch?: (
    referenceTable: string,
    search: string,
    callback: (options: { label: string; value: string | number }[]) => void
  ) => void
}

function DraggableRow<TData>({
  row,
  enableRowDragAndDrop,
  enableSelection,
  enableExpanding,
  enableEditing,
  enableAddSubRow,
  subRowKey,
  identifierKey,
  editingCell,
  onEditingCellChange,
  onEditValue,
  onAddSubRow,
  onForeignKeySearch,
  rowClassName,
}: DataTableRowProps<TData>) {
  const isSelected = row.getIsSelected()
  const depth = row.depth

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  }

  const renderCells = () =>
    row.getVisibleCells().map((cell) => {
      const column = cell.column
      const isPinned = column.getIsPinned()
      const isSelectColumn = column.id === "select"
      const isActionsColumn = column.id === "actions"
      const isSystemColumn = isSelectColumn || isActionsColumn

      const isEditingThisCell =
        editingCell?.rowIndex === row.index &&
        editingCell?.columnId === column.id

      return (
        <TableCell
          key={cell.id}
          style={getPinningStyles(column)}
          className={cn("px-2 py-2.5 text-sm", isPinned && "bg-inherit")}
        >
          {isSelectColumn && enableSelection ? (
            <SelectionCell
              row={row}
              enableRowDragAndDrop={enableRowDragAndDrop}
              enableExpanding={enableExpanding}
              enableAddSubRow={enableAddSubRow}
              subRowKey={subRowKey}
              onAddSubRow={onAddSubRow}
              dragAttributes={attributes}
              dragListeners={listeners}
            />
          ) : isSystemColumn ? (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          ) : enableEditing ? (
            <EditableCellWrapper
              cell={cell}
              row={row}
              isEditing={isEditingThisCell}
              onStartEdit={() =>
                onEditingCellChange({
                  rowIndex: row.index,
                  columnId: column.id,
                })
              }
              onCancelEdit={() => onEditingCellChange(null)}
              onSave={(value) => {
                const id = identifierKey
                  ? (row.original as any)[identifierKey]
                  : row.index
                onEditValue?.(value, id, () => onEditingCellChange(null), row)
              }}
              identifierKey={identifierKey}
              onForeignKeySearch={onForeignKeySearch}
            />
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      )
    })

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={isSelected ? "selected" : undefined}
      className={cn(
        "h-14 border-b border-border",
        "odd:bg-muted/40 even:bg-background",
        "hover:bg-muted",
        getRowClassName(isSelected, depth),
        isDragging && "bg-muted",
        rowClassName?.(row.original)
      )}
    >
      {renderCells()}
    </TableRow>
  )
}

function DataTableRow<TData>({
  row,
  enableSelection,
  enableExpanding,
  enableEditing,
  enableAddSubRow,
  subRowKey,
  identifierKey,
  editingCell,
  onEditingCellChange,
  onEditValue,
  onAddSubRow,
  onForeignKeySearch,
  rowClassName,
}: Omit<DataTableRowProps<TData>, "enableRowDragAndDrop">) {
  const isSelected = row.getIsSelected()
  const depth = row.depth

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className={cn(
        "h-14 border-b border-border",
        "odd:bg-muted/40 even:bg-background",
        "hover:bg-muted",
        getRowClassName(isSelected, depth),
        rowClassName?.(row.original)
      )}
    >
      {row.getVisibleCells().map((cell) => {
        const column = cell.column
        const isPinned = column.getIsPinned()
        const isSelectColumn = column.id === "select"
        const isActionsColumn = column.id === "actions"
        const isSystemColumn = isSelectColumn || isActionsColumn

        const isEditingThisCell =
          editingCell?.rowIndex === row.index &&
          editingCell?.columnId === column.id

        return (
          <TableCell
            key={cell.id}
            style={getPinningStyles(column)}
            className={cn("px-2 py-2.5 text-sm", isPinned && "bg-inherit")}
          >
            {isSelectColumn && enableSelection ? (
              <SelectionCell
                row={row}
                enableRowDragAndDrop={false}
                enableExpanding={enableExpanding}
                enableAddSubRow={enableAddSubRow}
                subRowKey={subRowKey}
                onAddSubRow={onAddSubRow}
              />
            ) : isSystemColumn ? (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            ) : enableEditing ? (
              <EditableCellWrapper
                cell={cell}
                row={row}
                isEditing={isEditingThisCell}
                onStartEdit={() =>
                  onEditingCellChange({
                    rowIndex: row.index,
                    columnId: column.id,
                  })
                }
                onCancelEdit={() => onEditingCellChange(null)}
                onSave={(value) => {
                  const id = identifierKey
                    ? (row.original as any)[identifierKey]
                    : row.index
                  onEditValue?.(value, id, () => onEditingCellChange(null), row)
                }}
                identifierKey={identifierKey}
                onForeignKeySearch={onForeignKeySearch}
              />
            ) : (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

export function DataTableBody<TData>({
  table,
  enableRowDragAndDrop = false,
  enableSelection = true,
  enableExpanding = false,
  enableEditing = false,
  enableAddSubRow = false,
  subRowKey,
  identifierKey,
  editingCell,
  onEditingCellChange,
  onEditValue,
  onRowOrderChange,
  onAddSubRow,
  emptyState,
  columnsCount,
  rowClassName,
  onForeignKeySearch,
}: TableBodyProps<TData>) {
  const rows = table.getRowModel().rows

  const rowIds = useMemo<UniqueIdentifier[]>(
    () => rows.map((row) => row.id),
    [rows]
  )

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (active && over && active.id !== over.id) {
        const oldIndex = rowIds.indexOf(active.id)
        const newIndex = rowIds.indexOf(over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          onRowOrderChange?.(oldIndex, newIndex)
        }
      }
    },
    [rowIds, onRowOrderChange]
  )

  const renderEmptyState = () => (
    <TableRow>
      <TableCell
        colSpan={columnsCount}
        className="h-32 text-center text-muted-foreground"
      >
        {typeof emptyState === "string" || emptyState === undefined ? (
          <DefaultEmptyState message={emptyState} />
        ) : (
          emptyState
        )}
      </TableCell>
    </TableRow>
  )

  const renderDraggableRows = () =>
    rows.map((row) => (
      <DraggableRow
        key={row.id}
        row={row}
        enableRowDragAndDrop={enableRowDragAndDrop}
        enableSelection={enableSelection}
        enableExpanding={enableExpanding}
        enableEditing={enableEditing}
        enableAddSubRow={enableAddSubRow}
        subRowKey={subRowKey}
        identifierKey={identifierKey}
        editingCell={editingCell}
        onEditingCellChange={onEditingCellChange}
        onEditValue={onEditValue}
        onAddSubRow={onAddSubRow}
        onForeignKeySearch={onForeignKeySearch}
        rowClassName={rowClassName}
      />
    ))

  const renderRows = () =>
    rows.map((row) => (
      <DataTableRow
        key={row.id}
        row={row}
        enableSelection={enableSelection}
        enableExpanding={enableExpanding}
        enableEditing={enableEditing}
        enableAddSubRow={enableAddSubRow}
        subRowKey={subRowKey}
        identifierKey={identifierKey}
        editingCell={editingCell}
        onEditingCellChange={onEditingCellChange}
        onEditValue={onEditValue}
        onAddSubRow={onAddSubRow}
        onForeignKeySearch={onForeignKeySearch}
        rowClassName={rowClassName}
      />
    ))

  if (enableRowDragAndDrop && onRowOrderChange) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        accessibility={{
          container: typeof document !== "undefined" ? document.body : undefined,
          restoreFocus: false,
        }}
      >
        <TableBodyPrimitive>
          <SortableContext
            items={rowIds}
            strategy={verticalListSortingStrategy}
          >
            {rows.length ? renderDraggableRows() : renderEmptyState()}
          </SortableContext>
        </TableBodyPrimitive>
      </DndContext>
    )
  }

  return (
    <TableBodyPrimitive>
      {rows.length ? renderRows() : renderEmptyState()}
    </TableBodyPrimitive>
  )
}

export { SelectionCell, EditableCellWrapper, DataTableRow, DraggableRow }
