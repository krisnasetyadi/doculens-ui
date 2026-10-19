import { ArrowDown, ArrowUp, ArrowUpDown, Check, ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionMenuContent,
  ActionMenuItem,
  ActionMenuLabel,
  ActionMenuSub,
  ActionMenuSubContent,
  ActionMenuSubTrigger,
} from "@/components/action-menu";
import { MENU_LUCIDE, MenuIcon } from "@/components/ui/menu-icons";
import { cn } from "@/lib/utils";
import type { SortKey, SortDir } from "../_types/sources.type";
import { IconButton } from "@/components/icon-button";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "type", label: "File type" },
];

/** The types a list can be narrowed to, offered as a second level under "File type". */
export interface SortTypeFilter {
  /** Only the types actually in the list. */
  options: string[];
  /** The type in force, or null for all of them. */
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SortBar({
  sort,
  onToggle,
  labeled = false,
  disabled,
  hiddenKeys = [],
  typeFilter,
}: {
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
  /** A button that names the sort key in force ("Date") instead of a bare icon. */
  labeled?: boolean;
  disabled?: boolean;
  /** Sort options left out of the menu. */
  hiddenKeys?: SortKey[];
  /** Makes "File type" a row with a second level to pick one type; clicking the row itself still sorts by type. */
  typeFilter?: SortTypeFilter;
}) {
  const options = OPTIONS.filter((option) => !hiddenKeys.includes(option.key));
  const DirIcon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {labeled ? (
          <Button
            variant="outline"
            disabled={disabled}
            className={cn("max-sm:flex-1", typeFilter?.value && "border-primary/40 bg-accent text-primary hover:bg-accent")}
          >
            <ArrowUpDown className="size-3.5" />
            {options.find((option) => option.key === sort.key)?.label ?? "Sort"}
            {typeFilter?.value && <span>· {typeFilter.value}</span>}
            {/* The order shows in the menu; here it is only read out. */}
            <span className="sr-only">{sort.dir === "asc" ? "Ascending" : "Descending"}</span>
          </Button>
        ) : (
          <IconButton
            label={typeFilter?.value ? `Sort, showing only ${typeFilter.value}` : "Sort"}
            type="button"
            size="sm"
            className="relative"
          >
            <ListFilter className="size-[18px]" strokeWidth={1.7} />
            {/* A filter hides files, so the icon says one is on; the ring keeps the dot clear of the glyph. */}
            {typeFilter?.value && (
              <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
            )}
          </IconButton>
        )}
      </DropdownMenuTrigger>
      <ActionMenuContent>
        {/* Only while a filter is on: one click instead of File type, then All types. */}
        {typeFilter?.value && (
          <ActionMenuItem onSelect={() => typeFilter.onChange(null)}>
            <MenuIcon><X {...MENU_LUCIDE} /></MenuIcon>
            Clear filter · {typeFilter.value}
          </ActionMenuItem>
        )}
        <ActionMenuLabel>
          Sort by
        </ActionMenuLabel>
        {options.map(({ key, label }) => {
          const active = sort.key === key;
          if (key === "type" && typeFilter) {
            return (
              <ActionMenuSub key={key}>
                <ActionMenuSubTrigger data-sort-key={key} onClick={() => onToggle(key)}>
                  <span>{label}</span>
                  {(active || typeFilter.value) && (
                    <span className="ml-auto flex items-center gap-1 text-primary">
                      {typeFilter.value && <span className="text-[11px]">{typeFilter.value}</span>}
                      {active && (
                        <DirIcon className="size-3.5" strokeWidth={1.7} aria-label={sort.dir === "asc" ? "Ascending" : "Descending"} />
                      )}
                    </span>
                  )}
                </ActionMenuSubTrigger>
                <ActionMenuSubContent>
                  <ActionMenuLabel>Show only</ActionMenuLabel>
                  {[null, ...typeFilter.options].map((option) => (
                    <ActionMenuItem
                      key={option ?? "all"}
                      onSelect={() => typeFilter.onChange(option)}
                      className="justify-between"
                    >
                      <span>{option ?? "All types"}</span>
                      {typeFilter.value === option && (
                        <Check className="size-3.5 text-primary" strokeWidth={1.7} aria-hidden="true" />
                      )}
                    </ActionMenuItem>
                  ))}
                </ActionMenuSubContent>
              </ActionMenuSub>
            );
          }
          return (
            <ActionMenuItem
              key={key}
              data-sort-key={key}
              onSelect={() => onToggle(key)}
              className="justify-between"
            >
              <span>{label}</span>
              {active && (
                <span className="flex items-center gap-1 text-primary">
                  <DirIcon className="size-3.5" strokeWidth={1.7} aria-label={sort.dir === "asc" ? "Ascending" : "Descending"} />
                  <Check className="size-3.5" strokeWidth={1.7} aria-hidden="true" />
                </span>
              )}
            </ActionMenuItem>
          );
        })}
      </ActionMenuContent>
    </DropdownMenu>
  );
}
