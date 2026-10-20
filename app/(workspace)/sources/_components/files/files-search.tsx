import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/icon-button";
import { cn } from "@/lib/utils";

/** The search box in the Files toolbar. It fills the box it is put in (at least 10rem), so the toolbar sets its width.
 * It filters as you type and looks in every folder; Escape clears it.
 * On a phone there is no room for a field beside the other controls, so it is a 40px icon button until tapped; then
 * the field takes the whole toolbar row (the parent hides the rest while `expanded`) and Cancel closes it again. */
export function FilesSearch({
  value,
  onChange,
  disabled,
  expanded,
  onExpand,
  onCollapse,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Phone only: the field is showing instead of the icon button. Wider screens always show the field. */
  expanded: boolean;
  onExpand: () => void;
  /** Clears the search and goes back to the icon button. */
  onCollapse: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const focusOnExpand = useRef(false);

  // The field is hidden until it is expanded, so focus has to wait for it to show.
  useEffect(() => {
    if (expanded && focusOnExpand.current) {
      focusOnExpand.current = false;
      inputRef.current?.focus();
    }
  }, [expanded]);

  return (
    <>
      {!expanded && (
        <Button
          type="button"
          variant="outline"
          aria-label="Search files and folders"
          disabled={disabled}
          onClick={() => {
            focusOnExpand.current = true;
            onExpand();
          }}
          className="w-10 px-0 sm:hidden"
        >
          <Search className="size-3.5" />
        </Button>
      )}
      <div className={cn("relative min-w-40 flex-1 max-sm:w-full max-sm:min-w-0", !expanded && "max-sm:hidden")}>
        <Search aria-hidden="true" className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", "size-3.5")} />
        <Input
          ref={inputRef}
          type="search"
          aria-label="Search files and folders"
          placeholder="Search"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (value) {
              event.preventDefault();
              onChange("");
            } else {
              onCollapse();
            }
          }}
          // 40px on a phone, the touch height of the buttons beside it.
          className={cn("pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none", "max-sm:h-10 md:text-[13px]")}
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
      {expanded && (
        <Button type="button" variant="ghost" onClick={onCollapse} className="sm:hidden">
          Cancel
        </Button>
      )}
    </>
  );
}
