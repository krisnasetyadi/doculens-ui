import { ArrowDown, ArrowUp, Check, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuLabel } from "@/components/action-menu";
import type { SortKey, SortDir } from "../_types/sources.type";
import { IconButton } from "@/components/icon-button";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "type", label: "File type" },
];

export function SortBar({
  sort,
  onToggle,
}: {
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
}) {
  const DirIcon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label="Sort"
          type="button"
          size="sm"
        >
          <ListFilter className="size-[18px]" strokeWidth={1.7} />
        </IconButton>
      </DropdownMenuTrigger>
      <ActionMenuContent>
        <ActionMenuLabel>
          Sort by
        </ActionMenuLabel>
        {OPTIONS.map(({ key, label }) => {
          const active = sort.key === key;
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
