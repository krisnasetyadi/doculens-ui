"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MENU_POSITION } from "@/lib/menu-styles"

interface SearchableSelectItem {
  value: string
  label: string
}

interface SearchableSelectProps {
  items: SearchableSelectItem[]
  value?: string | null
  onValueChange?: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  /** Leading glyph inside the trigger, before the label. */
  icon?: React.ReactNode
  /** "sm" scales the trigger and the dropdown (search, rows, empty text) to
   * the compact type scale used by dense panels; the dropdown is portaled out
   * of its container, so it can't inherit that size and must be told. */
  size?: "default" | "sm"
  /** Extra classes for the dropdown. It is portaled out of its container, so
   * anything the container sets for its children (e.g. a scaled `--spacing`)
   * has to be passed here as well. */
  contentClassName?: string
  "aria-invalid"?: boolean
}

/** Filterable single-select — same items/value/onValueChange shape as the
 * boilerplate's Combobox-based SearchableSelect, built on this repo's own
 * Popover + Command (cmdk) stack instead of pulling in @base-ui/react. */
function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyMessage = "Tidak ada hasil.",
  disabled,
  className,
  icon,
  size = "default",
  contentClassName,
  "aria-invalid": ariaInvalid,
}: SearchableSelectProps) {
  const sm = size === "sm"
  const [open, setOpen] = React.useState(false)
  const selected = items.find((item) => item.value === value) ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            sm && "h-8 px-2.5 text-xs",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <ChevronsUpDown className={cn("ml-2 shrink-0 opacity-50", sm ? "size-3.5" : "h-4 w-4")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] overflow-hidden rounded-[10px] border-border bg-[#fcfdff] p-0 font-['Inter'] shadow-[0_8px_24px_rgba(24,32,51,0.11)] dark:bg-popover dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
          sm && "text-xs",
          contentClassName,
        )}
        {...MENU_POSITION}
      >
        <Command
          className={cn(
            "max-h-full rounded-[10px] bg-transparent",
            sm && "**:data-[slot=command-input-wrapper]:h-8 **:data-[slot=command-input-wrapper]:px-2.5 **:data-[slot=command-input-wrapper]:gap-1.5 [&_[data-slot=command-input-wrapper]_svg]:size-3.5",
          )}
        >
          <CommandInput placeholder={searchPlaceholder} className={cn(sm && "h-8 py-0 text-xs")} />
          <CommandList
            className={cn(
              "overscroll-contain",
              sm
                ? "max-h-[min(224px,calc(var(--radix-popover-content-available-height)-2rem))]"
                : "max-h-[min(300px,calc(var(--radix-popover-content-available-height)-2.5rem))]",
            )}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <CommandEmpty {...(sm ? { className: "py-4 text-center text-xs" } : {})}>{emptyMessage}</CommandEmpty>
            <CommandGroup className="px-1 py-0.5">
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  className={cn(
                    "rounded-md font-['Inter'] data-[selected=true]:text-foreground",
                    sm && "gap-1.5 px-2 py-1.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
                  )}
                  value={item.label}
                  onSelect={() => {
                    onValueChange?.(item.value === value ? null : item.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "shrink-0",
                      sm ? "mr-1 size-3.5" : "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { SearchableSelect }
export type { SearchableSelectItem, SearchableSelectProps }
