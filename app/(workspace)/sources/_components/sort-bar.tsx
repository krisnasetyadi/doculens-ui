import { ArrowDown, ArrowUp, Check, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_CONTENT_CLASS, MENU_ITEM_CLASS, MENU_POSITION } from "@/lib/menu-styles";
import { cn } from "@/lib/utils";
import type { SortKey, SortDir } from "../_types/sources.type";

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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Sort"
          title="Sort"
          className="rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground"
        >
          <ListFilter className="size-[18px]" strokeWidth={1.7} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent {...MENU_POSITION} className={cn(MENU_CONTENT_CLASS, "min-w-40")}>
        <DropdownMenuLabel className="px-2 py-1 font-['Manrope'] text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Sort by
        </DropdownMenuLabel>
        {OPTIONS.map(({ key, label }) => {
          const active = sort.key === key;
          return (
            <DropdownMenuItem
              key={key}
              data-sort-key={key}
              onSelect={() => onToggle(key)}
              className={cn(MENU_ITEM_CLASS, "justify-between", active && "font-medium")}
            >
              <span>{label}</span>
              {active && (
                <span className="flex items-center gap-1 text-primary">
                  <DirIcon className="size-3.5" strokeWidth={1.7} aria-label={sort.dir === "asc" ? "Ascending" : "Descending"} />
                  <Check className="size-3.5" strokeWidth={1.7} aria-hidden="true" />
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
