import * as React from "react"
import dayjs from "dayjs"
import { ClockIcon } from "lucide-react"

import { parseInputDate, parseInputTime } from "@/lib/date"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { DatePickerField } from "@/components/fields/date-picker-field"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  triggerClassName?: string
  placeholder?: string
  /** Format used for the value passed to `onChange` (defaults to ISO, or ISO + time when withTime). */
  dateFormat?: string
  disabled?: boolean
  /** Shows a time selector alongside the calendar and includes time in the value/format. */
  withTime?: boolean
  /** Display format for the time selector. Defaults to "24h". */
  timeFormat?: "12h" | "24h"
  /** Adds a seconds selector (only relevant when withTime is set). */
  withSeconds?: boolean
  "aria-invalid"?: boolean
}

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad(i))
const HOURS_12 = Array.from({ length: 12 }, (_, i) => pad(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))
const SECONDS = MINUTES

interface TimeColumnProps {
  values: string[]
  selected: string
  onSelect: (value: string) => void
  disabled?: boolean
  "aria-label": string
}

/** One independently-scrollable column of an hour/minute/second/AM-PM picker. */
function TimeColumn({
  values,
  selected,
  onSelect,
  disabled,
  "aria-label": ariaLabel,
}: TimeColumnProps) {
  const selectedRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center" })
  }, [selected])

  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="no-scrollbar h-44 w-14 shrink-0 overflow-y-auto scroll-smooth"
    >
      {/* Vertical padding lets the first/last item scroll to the vertical center. */}
      <div className="flex flex-col items-center gap-0.5 px-1 py-[4.5rem]">
        {values.map((option) => {
          const isSelected = option === selected
          return (
            <button
              key={option}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled}
              onClick={() => onSelect(option)}
              className={cn(
                "w-11 shrink-0 rounded-md py-1.5 text-center text-sm tabular-nums transition-colors",
                isSelected
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DatePicker({
  value = "",
  onChange,
  className,
  triggerClassName,
  placeholder,
  dateFormat,
  disabled = false,
  withTime = false,
  timeFormat = "24h",
  withSeconds = false,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const timeValueFormat = withSeconds ? "HH:mm:ss" : "HH:mm"
  const resolvedDateFormat =
    dateFormat ?? (withTime ? `YYYY-MM-DD ${timeValueFormat}` : "YYYY-MM-DD")
  const resolvedPlaceholder =
    placeholder ?? (withTime ? `DD/MM/YYYY ${timeValueFormat}` : "DD/MM/YYYY")
  const displayFormat = withTime ? `DD/MM/YYYY ${timeValueFormat}` : "DD/MM/YYYY"
  const timeDisplayFormat = withSeconds
    ? timeFormat === "12h"
      ? "hh:mm:ss A"
      : "HH:mm:ss"
    : timeFormat === "12h"
      ? "hh:mm A"
      : "HH:mm"

  const [open, setOpen] = React.useState(false)
  const [timeOpen, setTimeOpen] = React.useState(false)
  // Raw keyboard input; null means show the formatted value instead.
  const [inputText, setInputText] = React.useState<string | null>(null)
  const [timeInputText, setTimeInputText] = React.useState<string | null>(null)

  const selectedDate = value ? dayjs(value).toDate() : undefined

  const hour24 = value ? dayjs(value).hour() : 0
  const minute = value ? dayjs(value).minute() : 0
  const second = value ? dayjs(value).second() : 0
  const period: "AM" | "PM" = hour24 < 12 ? "AM" : "PM"
  const hour12 = ((hour24 + 11) % 12) + 1

  function commit(next: dayjs.Dayjs) {
    onChange?.(next.format(resolvedDateFormat))
  }

  function timeBase() {
    return value ? dayjs(value) : dayjs()
  }

  function handleSelectDate(date: Date | undefined) {
    if (!date) {
      onChange?.("")
      return
    }

    setInputText(null)
    setTimeInputText(null)

    if (withTime) {
      // Preserve the time-of-day already chosen (defaults to 00:00:00 for a fresh pick).
      const next = value
        ? dayjs(date)
            .hour(dayjs(value).hour())
            .minute(dayjs(value).minute())
            .second(dayjs(value).second())
        : dayjs(date).hour(0).minute(0).second(0)
      commit(next)
      return
    }

    commit(dayjs(date))
    setTimeout(() => setOpen(false), 200)
  }

  function handleHourChange(raw: string) {
    const selectedHour = Number(raw)
    const nextHour24 =
      timeFormat === "12h"
        ? period === "PM"
          ? (selectedHour % 12) + 12
          : selectedHour % 12
        : selectedHour
    setTimeInputText(null)
    commit(timeBase().hour(nextHour24))
  }

  function handleMinuteChange(raw: string) {
    setTimeInputText(null)
    commit(timeBase().minute(Number(raw)))
  }

  function handleSecondChange(raw: string) {
    setTimeInputText(null)
    commit(timeBase().second(Number(raw)))
  }

  function handlePeriodChange(raw: string) {
    const nextHour24 = raw === "PM" ? (hour12 % 12) + 12 : hour12 % 12
    setTimeInputText(null)
    commit(timeBase().hour(nextHour24))
  }

  function handleTimeInput(raw: string) {
    setTimeInputText(raw)
    if (raw === "") return
    const parsed = parseInputTime(raw)
    if (parsed) {
      commit(
        timeBase()
          .hour(parsed.hour())
          .minute(parsed.minute())
          .second(withSeconds ? parsed.second() : 0)
      )
    }
  }

  function handleClear() {
    onChange?.("")
    setInputText(null)
    setTimeInputText(null)
    setOpen(false)
  }

  function handleInput(raw: string) {
    setInputText(raw)
    if (raw === "") {
      onChange?.("")
      return
    }
    const parsed = parseInputDate(raw)
    if (parsed) {
      commit(parsed)
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <DatePickerField
          value={
            inputText !== null
              ? inputText
              : value
                ? dayjs(value).format(displayFormat)
                : ""
          }
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          showClear={!!value}
          onValueChange={handleInput}
          onBlur={() => setInputText(null)}
          onClear={handleClear}
          className={triggerClassName}
          ariaLabel={withTime ? "Date and time" : "Date"}
          ariaInvalid={ariaInvalid}
        />
        <PopoverContent
          className="w-auto p-0"
          align="start"
          sideOffset={4}
          collisionPadding={8}
        >
          <Calendar mode="single" selected={selectedDate} onSelect={handleSelectDate} />
          {withTime && (
            <div className="flex items-center gap-2 border-t border-border p-2.5">
              <span className="text-sm text-muted-foreground">Time</span>
              <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                <PopoverAnchor asChild>
                  <div className="flex h-8 w-32 items-center gap-1 rounded-lg border border-input bg-transparent pr-2 pl-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50">
                    <input
                      type="text"
                      disabled={!selectedDate}
                      placeholder={timeValueFormat}
                      aria-label="Time"
                      value={
                        timeInputText !== null
                          ? timeInputText
                          : value
                            ? dayjs(value).format(timeDisplayFormat)
                            : ""
                      }
                      onChange={(event) => handleTimeInput(event.target.value)}
                      onBlur={() => setTimeInputText(null)}
                      className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!selectedDate}
                        aria-label="Open time picker"
                        className="text-muted-foreground outline-none transition-colors hover:text-foreground"
                      >
                        <ClockIcon className="size-4" />
                      </button>
                    </PopoverTrigger>
                  </div>
                </PopoverAnchor>
                <PopoverContent
                  className="w-auto p-1"
                  align="center"
                  sideOffset={6}
                  collisionPadding={8}
                >
                  <div className="flex divide-x divide-border">
                    <TimeColumn
                      aria-label="Hour"
                      values={timeFormat === "12h" ? HOURS_12 : HOURS_24}
                      selected={pad(timeFormat === "12h" ? hour12 : hour24)}
                      onSelect={handleHourChange}
                      disabled={!selectedDate}
                    />
                    <TimeColumn
                      aria-label="Minute"
                      values={MINUTES}
                      selected={pad(minute)}
                      onSelect={handleMinuteChange}
                      disabled={!selectedDate}
                    />
                    {withSeconds && (
                      <TimeColumn
                        aria-label="Second"
                        values={SECONDS}
                        selected={pad(second)}
                        onSelect={handleSecondChange}
                        disabled={!selectedDate}
                      />
                    )}
                    {timeFormat === "12h" && (
                      <TimeColumn
                        aria-label="AM or PM"
                        values={["AM", "PM"]}
                        selected={period}
                        onSelect={handlePeriodChange}
                        disabled={!selectedDate}
                      />
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker }
export type { DatePickerProps }
