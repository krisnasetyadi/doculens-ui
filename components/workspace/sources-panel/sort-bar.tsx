import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SortKey, SortDir } from "./sources-types";

export function SortButton({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      data-sort-key={sortKey}
      className={cn(
        "h-7 gap-1 px-2 py-1 text-xs font-bold font-['Manrope'] rounded-xl",
        active
          ? "text-primary bg-primary/10 hover:bg-primary/10 hover:text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </Button>
  );
}

export function SortBar({
  sort,
  onToggle,
}: {
  sort: { key: SortKey; dir: SortDir };
  onToggle: (key: SortKey) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <span className="text-xs text-muted-foreground/60 font-['Inter'] mr-1">Sort:</span>
      <SortButton
        label="Name"
        sortKey="name"
        active={sort.key === "name"}
        dir={sort.dir}
        onClick={() => onToggle("name")}
      />
      <SortButton
        label="Date"
        sortKey="date"
        active={sort.key === "date"}
        dir={sort.dir}
        onClick={() => onToggle("date")}
      />
      <SortButton
        label="File Type"
        sortKey="type"
        active={sort.key === "type"}
        dir={sort.dir}
        onClick={() => onToggle("type")}
      />
    </div>
  );
}
