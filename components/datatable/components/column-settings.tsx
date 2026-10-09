import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  type CSSProperties,
} from "react"
import { type Table } from "@tanstack/react-table"
import {
  Settings2,
  RotateCcw,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  GripVertical,
} from "lucide-react"

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
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ActionMenuCheckboxItem,
  ActionMenuContent,
  ActionMenuLabel,
  ActionMenuSeparator,
} from "@/components/action-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

import { cn } from "@/lib/utils"
import { getVisibleColumnsCount, SYSTEM_COLUMN_IDS } from "../utils"
import { IconButton } from "@/components/icon-button";

interface ColumnSettingsProps<TData> {
  table: Table<TData>
  enableColumnReorder?: boolean
  onResetSettings?: () => void
  onColumnOrderChange?: (newOrder: string[]) => void
}

interface ColumnVisibilityDropdownProps<TData> {
  table: Table<TData>

  trigger?: React.ReactElement
  contentClassName?: string
  align?: "start" | "center" | "end"
}

export function ColumnVisibilityDropdown<TData>({
  table,
  trigger,
  contentClassName,
  align = "end",
}: ColumnVisibilityDropdownProps<TData>) {
  // Use local state that manages visibility
  const [localVisibility, setLocalVisibility] = useState<
    Record<string, boolean>
  >({})
  const [isInitialized, setIsInitialized] = useState(false)

  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        column.getCanHide() && !SYSTEM_COLUMN_IDS.includes(column.id as any)
    )

  useEffect(() => {
    if (!isInitialized && columns.length > 0) {
      const initialVisibility: Record<string, boolean> = {}
      columns.forEach((col) => {
        initialVisibility[col.id] = col.getIsVisible()
      })
      setLocalVisibility(initialVisibility)
      setIsInitialized(true)
    }
  }, [columns, isInitialized])

  const visibleCount =
    Object.values(localVisibility).filter(Boolean).length || columns.length

  const handleToggleVisibility = useCallback(
    (columnId: string, value: boolean) => {
      setLocalVisibility((prev) => ({
        ...prev,
        [columnId]: value,
      }))

      const column = table.getColumn(columnId)
      if (column) {
        column.toggleVisibility(value)
      }
    },
    [table]
  )

  const defaultTrigger = (
    <Button
      variant="outline"
    >
      <Settings2 className="h-4 w-4" />
      <span>Columns</span>
      <Badge className="ml-1">{visibleCount}</Badge>
    </Button>
  )

  // Check visibility from local state, default to true if not set
  const isColumnVisible = (columnId: string) => {
    if (columnId in localVisibility) {
      return localVisibility[columnId]
    }
    return true
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger || defaultTrigger}</DropdownMenuTrigger>
      <ActionMenuContent align={align} className={contentClassName}>
        <ActionMenuLabel>Toggle Columns</ActionMenuLabel>
        <ActionMenuSeparator />
        {columns.map((column) => (
          <ActionMenuCheckboxItem
            key={column.id}
            className="capitalize"
            checked={isColumnVisible(column.id)}
            onCheckedChange={(value) =>
              handleToggleVisibility(column.id, !!value)
            }
          >
            {typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : column.id}
          </ActionMenuCheckboxItem>
        ))}
      </ActionMenuContent>
    </DropdownMenu>
  )
}

interface ColumnItemProps {
  id: string
  label: string
  isVisible: boolean
  isPinned: false | "left" | "right"
  onToggleVisibility: () => void
  onTogglePin: (position: false | "left" | "right") => void
  enableReorder?: boolean
}

function ColumnItem({
  id,
  label,
  isVisible,
  isPinned,
  onToggleVisibility,
  onTogglePin,
  enableReorder = true,
}: ColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !enableReorder,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg p-2",
        "border border-border bg-background",
        !isVisible && "opacity-50"
      )}
    >
      {enableReorder && (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="flex-1 truncate text-sm font-medium">{label}</div>

      <IconButton size="sm" label={isVisible ? "Hide column" : "Show column"} onClick={onToggleVisibility}>
        {isVisible ? (
          <Eye className="h-4 w-4 text-primary" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </IconButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton size="sm" label="Pin column">
            {isPinned ? (
              <Pin className="h-4 w-4 text-primary" />
            ) : (
              <Pin className="h-4 w-4 text-muted-foreground" />
            )}
          </IconButton>
        </DropdownMenuTrigger>
        <ActionMenuContent align="end">
          <ActionMenuCheckboxItem
            checked={isPinned === "left"}
            onCheckedChange={() =>
              onTogglePin(isPinned === "left" ? false : "left")
            }
          >
            Pin to Left
          </ActionMenuCheckboxItem>
          <ActionMenuCheckboxItem
            checked={isPinned === "right"}
            onCheckedChange={() =>
              onTogglePin(isPinned === "right" ? false : "right")
            }
          >
            Pin to Right
          </ActionMenuCheckboxItem>
          {isPinned && (
            <>
              <ActionMenuSeparator />
              <ActionMenuCheckboxItem
                checked={false}
                onCheckedChange={() => onTogglePin(false)}
              >
                <PinOff className="h-4 w-4" />
                Unpin
              </ActionMenuCheckboxItem>
            </>
          )}
        </ActionMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function ColumnSettings<TData>({
  table,
  enableColumnReorder = true,
  onResetSettings,
  onColumnOrderChange,
}: ColumnSettingsProps<TData>) {
  const [open, setOpen] = useState(false)

  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        column.getCanHide() && !SYSTEM_COLUMN_IDS.includes(column.id as any)
    )

  const visibleCount = getVisibleColumnsCount(table)
  const totalCount = columns.length

  const columnIds = useMemo<UniqueIdentifier[]>(
    () => columns.map((col) => col.id),
    [columns]
  )

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (active && over && active.id !== over.id) {
        const oldIndex = columnIds.indexOf(active.id)
        const newIndex = columnIds.indexOf(over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(
            [...columnIds] as string[],
            oldIndex,
            newIndex
          )
          onColumnOrderChange?.(newOrder)
        }
      }
    },
    [columnIds, onColumnOrderChange]
  )

  const handleShowAll = () => {
    columns.forEach((column) => column.toggleVisibility(true))
  }

  const handleHideAll = () => {
    columns.forEach((column) => column.toggleVisibility(false))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <span>Columns</span>
          <Badge className="ml-1">
            {visibleCount}/{totalCount}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-semibold">Column Settings</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleShowAll}>
              Show All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleHideAll}>
              Hide All
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-2 p-3">
            {enableColumnReorder ? (
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={columnIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {columns.map((column) => (
                      <ColumnItem
                        key={column.id}
                        id={column.id}
                        label={
                          typeof column.columnDef.header === "string"
                            ? column.columnDef.header
                            : column.id
                        }
                        isVisible={column.getIsVisible()}
                        isPinned={column.getIsPinned()}
                        onToggleVisibility={() =>
                          column.toggleVisibility(!column.getIsVisible())
                        }
                        onTogglePin={(position) => column.pin(position)}
                        enableReorder
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-2">
                {columns.map((column) => (
                  <ColumnItem
                    key={column.id}
                    id={column.id}
                    label={
                      typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id
                    }
                    isVisible={column.getIsVisible()}
                    isPinned={column.getIsPinned()}
                    onToggleVisibility={() =>
                      column.toggleVisibility(!column.getIsVisible())
                    }
                    onTogglePin={(position) => column.pin(position)}
                    enableReorder={false}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {onResetSettings && (
          <div className="flex items-center justify-end border-t p-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={onResetSettings}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { ColumnItem }
