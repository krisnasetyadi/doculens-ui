import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { inputVariants } from "@/components/ui/input"
import { PopoverAnchor, PopoverTrigger } from "@/components/ui/popover"
import { IconButton } from "@/components/icon-button";

interface DatePickerFieldProps {
  value: string
  placeholder: string
  disabled?: boolean
  showClear: boolean
  onValueChange: (raw: string) => void
  onBlur: () => void
  onClear: () => void
  className?: string
  ariaLabel: string
  ariaInvalid?: boolean
  /** Icon shown in the trigger button; defaults to a calendar icon. */
  triggerIcon?: React.ReactNode
}

/**
 * Shared single-input trigger row (text input + clear button + popover
 * trigger) used by DatePicker and DateTimePicker. Must be rendered inside a
 * <Popover>, since it only renders the PopoverTrigger, not the popover itself.
 *
 * Wraps its own root in PopoverAnchor so the popover positions itself
 * relative to the whole field row instead of just the calendar-icon trigger
 * button (the right edge of the row) — otherwise it drifts badly on wide
 * fields.
 */
function DatePickerField({
  value,
  placeholder,
  disabled,
  showClear,
  onValueChange,
  onBlur,
  onClear,
  className,
  ariaLabel,
  ariaInvalid,
  triggerIcon,
}: DatePickerFieldProps) {
  return (
    <PopoverAnchor asChild>
      <div
        aria-invalid={ariaInvalid}
        className={cn(
          inputVariants(),
          "flex items-center p-0 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "pointer-events-none bg-input/50 opacity-50",
          className
        )}
      >
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlur}
          className="h-full min-w-0 flex-1 bg-transparent pr-1 pl-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex shrink-0 items-center gap-1 pr-2">
          {showClear && !disabled && (
            <IconButton
              size="sm"
              type="button"
              label={`Clear ${ariaLabel.toLowerCase()}`}
              onClick={onClear}
            >
              <XIcon className="size-3" />
            </IconButton>
          )}
          <PopoverTrigger asChild>
            <IconButton
              size="sm"
              type="button"
              label="Open calendar picker"
              disabled={disabled}
            >
              {triggerIcon ?? <CalendarIcon className="size-4" />}
            </IconButton>
          </PopoverTrigger>
        </div>
      </div>
    </PopoverAnchor>
  )
}

export { DatePickerField }
export type { DatePickerFieldProps }
