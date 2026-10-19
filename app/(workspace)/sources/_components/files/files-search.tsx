import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/icon-button";
import { cn } from "@/lib/utils";

/** The search box in the Files toolbar. It fills the box it is put in (at least 10rem), so the toolbar sets its width.
 * It filters as you type and looks in every folder; Escape clears it. */
export function FilesSearch({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative min-w-40 flex-1 max-sm:w-full">
      <Search aria-hidden="true" className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", "size-3.5")} />
      <Input
        type="search"
        aria-label="Search files and folders"
        placeholder="Search"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        className={cn("pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none", "md:text-[13px]")}
      />
      {value && (
        <IconButton
          size="sm"
          label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          <X className="size-3.5" />
        </IconButton>
      )}
    </div>
  );
}
