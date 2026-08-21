import { useEffect, useState, type ElementType } from "react"
import { useForm } from "react-hook-form"
import { Ellipsis, GripVertical, Trash2 } from "lucide-react"
import type { Row } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"

import { cn, debounce } from "@/lib/utils"

const MAX_VISIBLE_COLUMNS = 3
const DEBOUNCE_TIME = 1500

export interface BulkEditColumn {
  name: string
  label: string
  type: "text" | "number" | "select" | "date" | "time" | "multiple-select"
  icon: ElementType
  placeholder?: string
  formatDate?: string
  options?: { label: string; value: string }[]
  initialValue?: (
    setValue: (name: string, value: any) => void,
    column: BulkEditColumn,
    selection: Row<any>
  ) => void
}

interface BulkEditingBarProps<TData> {
  selectedRows: Row<TData>[]
  columns: BulkEditColumn[]
  onSave: (data: any[], callback: () => void) => void
  onDelete?: (rows: Row<TData>[]) => void
  onClearSelection?: () => void
  isLoading?: boolean
}

export function BulkEditingBar<TData>({
  selectedRows,
  columns,
  onSave,
  onDelete,
  onClearSelection,
  isLoading = false,
}: BulkEditingBarProps<TData>) {
  const form = useForm()

  const [fieldColumns, setFieldColumns] = useState<{
    visible: BulkEditColumn[]
    hidden: BulkEditColumn[]
  }>({
    visible: [],
    hidden: [],
  })

  // State to trigger save after debounce
  const [pendingChanges, setPendingChanges] = useState<string | null>(null)

  useEffect(() => {
    setFieldColumns({
      visible: columns.slice(0, MAX_VISIBLE_COLUMNS),
      hidden: columns.slice(MAX_VISIBLE_COLUMNS),
    })
  }, [columns])

  // Reset form when selection changes
  useEffect(() => {
    form.reset()
  }, [selectedRows, form])

  // Handle save when pendingChanges is set
  useEffect(() => {
    if (pendingChanges === null) return

    const formValues = form.getValues()
    const hasValue = Object.values(formValues).some(
      (v) => v !== undefined && v !== ""
    )

    if (hasValue && selectedRows.length > 0) {
      const body = selectedRows.map((row) => ({
        id: (row.original as any).id,
        ...formValues,
      }))

      onSave(body, () => {
        onClearSelection?.()
        form.reset()
      })
    }

    setPendingChanges(null)
  }, [pendingChanges, form, selectedRows, onSave, onClearSelection])

  const handleColumnClick = (column: BulkEditColumn) => {
    if (selectedRows.length > 0) {
      if (column.initialValue) {
        column.initialValue(form.setValue, column, selectedRows[0])
      } else {
        const firstRowValue = (selectedRows[0].original as any)[column.name]
        form.setValue(column.name, firstRowValue)
      }
    }
  }

  const handleValueChange = debounce((value: any) => {
    setPendingChanges(String(value) || "changed")
  }, DEBOUNCE_TIME)

  const handleDelete = () => {
    if (onDelete) {
      onDelete(selectedRows)
    }
  }

  if (selectedRows.length === 0) {
    return null
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className={cn(
        "flex h-12 border border-border p-2",
        "items-center gap-4 rounded-lg bg-background text-sm"
      )}
    >
      <span className="font-medium whitespace-nowrap text-primary">
        {selectedRows.length} selected
      </span>

      {fieldColumns.visible.map((column) => (
        <div key={column.name} className="flex items-center">
          <Separator orientation="vertical" className="mr-3 h-6" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => handleColumnClick(column)}
                disabled={isLoading}
              >
                <column.icon className="h-4 w-4" />
                <span>{column.label}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <FieldInput
                column={column}
                control={form.control}
                register={form.register}
                setValue={form.setValue}
                onValueChange={handleValueChange}
                disabled={isLoading}
              />
            </PopoverContent>
          </Popover>
        </div>
      ))}

      <Separator orientation="vertical" className="h-6" />

      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={isLoading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {fieldColumns.hidden.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={isLoading}
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="flex flex-col gap-1">
              {fieldColumns.hidden.map((column, idx) => (
                <div key={column.name}>
                  {idx > 0 && <Separator className="my-1" />}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <column.icon className="h-4 w-4" />
                        <span className="text-sm">{column.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Click to edit {column.label}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </form>
  )
}

interface FieldInputProps {
  column: BulkEditColumn
  control: any
  register: any
  setValue: (name: string, value: any) => void
  onValueChange: (value: any) => void
  disabled?: boolean
}

function FieldInput({
  column,
  register,
  setValue,
  onValueChange,
  disabled,
}: FieldInputProps) {
  switch (column.type) {
    case "select":
      return (
        <Select
          onValueChange={(value) => {
            setValue(column.name, value)
            onValueChange(value)
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={column.placeholder || `Select ${column.label}`}
            />
          </SelectTrigger>
          <SelectContent>
            {column.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "number":
      return (
        <Input
          type="number"
          placeholder={column.placeholder || `Enter ${column.label}`}
          {...register(column.name)}
          onChange={(e) => {
            setValue(column.name, e.target.value)
            onValueChange(e.target.value)
          }}
          disabled={disabled}
        />
      )

    case "text":
    default:
      return (
        <Input
          type="text"
          placeholder={column.placeholder || `Enter ${column.label}`}
          {...register(column.name)}
          onChange={(e) => {
            setValue(column.name, e.target.value)
            onValueChange(e.target.value)
          }}
          disabled={disabled}
        />
      )
  }
}
