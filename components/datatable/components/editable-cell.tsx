import { useState, useEffect, useCallback } from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DatePicker } from "@/components/fields/date-picker"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { cn } from "@/lib/utils"

// Data types matching backend
export const CellDataType = {
  FOREIGN_KEY: 0,
  TEXT: 1,
  INT: 2,
  FRACTION: 3,
  DATETIME: 4,
  BOOLEAN: 5,
  MULTISELECT: 6,
} as const

export type CellDataType = (typeof CellDataType)[keyof typeof CellDataType]

interface EditableCellProps {
  isEditing: boolean
  value: any
  dataType: CellDataType
  attribute: string
  referenceTable?: string
  nestedColumnName?: string
  onSave: (data: Record<string, any>) => void
  onCancelEdit: () => void
  foreignKeyOptions?: { label: string; value: string | number }[]
  onForeignKeySearch?: (search: string) => void
  disabled?: boolean
  multiselectOptions?: { label: string; value: string | number }[]
}

export function EditableCell({
  isEditing,
  value,
  dataType,
  attribute,
  onSave,
  onCancelEdit,
  foreignKeyOptions = [],
  onForeignKeySearch,
  disabled = false,
  multiselectOptions = [],
}: EditableCellProps) {
  const [editValue, setEditValue] = useState<any>(value ?? "")
  const [error, setError] = useState("")
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    if (isEditing) {
      setEditValue(value ?? "")
      setError("")
    }
  }, [isEditing, value, dataType])

  useEffect(() => {
    if (
      popoverOpen &&
      dataType === CellDataType.FOREIGN_KEY &&
      onForeignKeySearch
    ) {
      onForeignKeySearch("")
    }
  }, [popoverOpen, dataType, onForeignKeySearch])

  const validate = useCallback(() => {
    if (dataType === CellDataType.INT || dataType === CellDataType.FRACTION) {
      const num = Number.parseFloat(String(editValue))
      if (isNaN(num)) {
        setError("Please enter a valid number")
        return false
      }
    }
    setError("")
    return true
  }, [editValue, dataType])

  const handleSave = useCallback(() => {
    if (validate()) {
      let saveValue = editValue

      // Format value based on type
      if (dataType === CellDataType.INT) {
        saveValue = parseInt(String(editValue), 10)
      } else if (dataType === CellDataType.FRACTION) {
        saveValue = parseFloat(String(editValue))
      }

      onSave({ [attribute]: saveValue })
    }
  }, [validate, editValue, dataType, attribute, onSave])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      onCancelEdit()
    }
  }

  const handleBlur = () => {
    if (isEditing && !error) {
      handleSave()
    }
  }

  const renderEditableInput = () => {
    switch (dataType) {
      case CellDataType.TEXT:
        return (
          <Input
            type="text"
            className="h-8 w-full"
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            autoFocus
          />
        )

      case CellDataType.INT:
        return (
          <Input
            type="number"
            className="h-8 w-full"
            value={editValue as number}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            autoFocus
          />
        )

      case CellDataType.FRACTION:
        return (
          <Input
            type="number"
            step="0.01"
            className="h-8 w-full"
            value={editValue as number}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            autoFocus
          />
        )

      case CellDataType.FOREIGN_KEY: {
        return (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-full justify-between text-left font-normal",
                  !editValue && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <span className="truncate">
                  {editValue
                    ? foreignKeyOptions.find((opt) => opt.value === editValue)
                        ?.label || "Select..."
                    : "Select..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search..."
                  onValueChange={(search) => onForeignKeySearch?.(search)}
                />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {foreignKeyOptions.map((option) => (
                      <CommandItem
                        key={String(option.value)}
                        value={option.label}
                        onSelect={() => {
                          setEditValue(option.value)
                          setPopoverOpen(false)
                          onSave({ [attribute]: option.value })
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            editValue === option.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )
      }

      case CellDataType.DATETIME:
        return (
          <DatePicker
            value={typeof editValue === "string" ? editValue : ""}
            onChange={(value) => {
              setEditValue(value)
              if (value) {
                onSave({ [attribute]: value })
              }
            }}
            placeholder="Pick a date"
            disabled={disabled}
            className="w-full"
          />
        )

      case CellDataType.BOOLEAN:
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={editValue === true || editValue === "true"}
              onCheckedChange={(checked) => {
                setEditValue(checked)
                onSave({ [attribute]: checked })
              }}
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">
              {editValue === true || editValue === "true" ? "Yes" : "No"}
            </span>
          </div>
        )

      case CellDataType.MULTISELECT:
        return (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-between text-left font-normal",
                  !editValue && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                {editValue
                  ? multiselectOptions.find((opt) => opt.value === editValue)
                      ?.label || "Select..."
                  : "Select..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search..." />
                <CommandList>
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandGroup>
                    {multiselectOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => {
                          setEditValue(option.value)
                          onSave({ [attribute]: option.value })
                          setPopoverOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            editValue === option.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )

      default:
        return (
          <Input
            type="text"
            className="h-8 w-full"
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            autoFocus
          />
        )
    }
  }

  if (!isEditing) {
    return null
  }

  return (
    <div
      className={cn(
        "min-h-[32px] w-full rounded px-2 py-1",
        "bg-accent ring-2 ring-ring",
        "relative"
      )}
    >
      <button
        type="button"
        className="absolute top-1 right-1 rounded-full bg-muted p-0.5 hover:bg-muted-foreground/20"
        onClick={onCancelEdit}
      >
        <X className="h-3 w-3" />
      </button>

      <div className="pr-5">{renderEditableInput()}</div>

      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </div>
  )
}
