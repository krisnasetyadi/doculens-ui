import * as React from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { PopoverAnchor, PopoverTrigger } from "@/components/ui/popover"

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
          "flex h-8 w-full items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
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
            <button
              type="button"
              onClick={onClear}
              aria-label={`Clear ${ariaLabel.toLowerCase()}`}
              className="rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
            >
              <XIcon className="size-3" />
            </button>
          )}
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Open calendar picker"
              className="text-muted-foreground outline-none transition-colors hover:text-foreground"
            >
              {triggerIcon ?? <CalendarIcon className="size-4" />}
            </button>
          </PopoverTrigger>
        </div>
      </div>
    </PopoverAnchor>
  )
}

export { DatePickerField }
export type { DatePickerFieldProps }
