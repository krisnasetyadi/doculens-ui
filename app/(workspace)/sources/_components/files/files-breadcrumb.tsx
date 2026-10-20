import { useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuLabel } from "@/components/action-menu";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import { HEADING_TEXT_CLASS } from "../sources-ui";
import type { Folder } from "@/services/source-folders/type/source-folder.type";

const CRUMB_CLASS =
  "max-w-40 shrink-0 truncate rounded-md px-1.5 py-1 font-manrope text-[15px] font-bold leading-6 text-muted-foreground outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:bg-accent/60";

const SEPARATOR = <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/50" />;

/** Where the person is: the title of the Files panel. The current folder is the heading, the folders
 * above it are quiet links back up, and a search takes the place of the path (it looks in every folder).
 * The whole path is shown while it fits. Only when it does not, the oldest folders fold into a "..." menu
 * one at a time, until it fits, like Drive: All files > ... > Parent > Current. */
export function FilesBreadcrumb({
  trail,
  searching,
  onNavigate,
}: {
  /** Root to current folder; empty at the top level. */
  trail: Folder[];
  searching: boolean;
  onNavigate: (folderId: string | null) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  // The width the toolbar row has, so the fold is worked out again when the window or the panel is resized.
  const [rowWidth, setRowWidth] = useState(0);
  useLayoutEffect(() => {
    const row = navRef.current?.parentElement;
    if (!row) return;
    const observer = new ResizeObserver(() => setRowWidth(row.clientWidth));
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  // Start from the full path and fold one more folder while it still overflows. The count belongs to the
  // path and width it was measured for, so a new path or a new width starts again from none folded. Layout
  // effects re-render before paint, so the steps in between are never seen.
  const key = `${trail.map((folder) => folder.folder_id).join("/")}|${searching}|${rowWidth}`;
  const [measured, setMeasured] = useState({ key, hidden: 0 });
  const maxHidden = Math.max(trail.length - 1, 0);
  const hiddenCount = measured.key === key ? Math.min(measured.hidden, maxHidden) : 0;
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (nav && hiddenCount < maxHidden && nav.scrollWidth > nav.clientWidth) {
      setMeasured({ key, hidden: hiddenCount + 1 });
    }
  });

  const hidden = trail.slice(0, hiddenCount);
  const shown = trail.slice(hiddenCount);
  // With only the current folder left to show it may truncate; before that every crumb keeps its width,
  // so overflow means "does not fit" and not "was squeezed".
  const lastResort = hiddenCount === maxHidden;
  const titleClass = `min-w-0 truncate px-1.5 py-1 ${HEADING_TEXT_CLASS}`;

  return (
    <nav ref={navRef} aria-label="Folder breadcrumb" className="-ml-1.5 mr-auto flex max-sm:min-w-0 max-sm:flex-1 min-w-40 shrink items-center overflow-hidden">
      {searching ? (
        <>
          <span className={titleClass}>Search results</span>
          <span className="shrink-0 text-xs text-muted-foreground">in all folders</span>
        </>
      ) : trail.length === 0 ? (
        <span className={titleClass}>All files</span>
      ) : (
        <>
          <button type="button" onClick={() => onNavigate(null)} className={CRUMB_CLASS}>
            All files
          </button>
          {hidden.length > 0 && (
            <span className="flex shrink-0 items-center">
              {SEPARATOR}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Show the folders in between" title="Show the folders in between" className={CRUMB_CLASS}>
                    …
                  </button>
                </DropdownMenuTrigger>
                <ActionMenuContent align="start" className="w-52">
                  <ActionMenuLabel>Go to</ActionMenuLabel>
                  {hidden.map((folder) => (
                    <ActionMenuItem key={folder.folder_id} onSelect={() => onNavigate(folder.folder_id)} className="truncate">
                      {folder.name}
                    </ActionMenuItem>
                  ))}
                </ActionMenuContent>
              </DropdownMenu>
            </span>
          )}
          {shown.map((folder) => {
            const current = folder.folder_id === trail[trail.length - 1].folder_id;
            return (
              <span key={folder.folder_id} className={cn("flex items-center", !current || !lastResort ? "shrink-0" : "min-w-0")}>
                {SEPARATOR}
                {current ? (
                  <TruncatedTooltip label={folder.name}>
                    <span aria-current="page" className={cn(titleClass, lastResort ? "max-w-full" : "max-w-64")}>
                      {folder.name}
                    </span>
                  </TruncatedTooltip>
                ) : (
                  <TruncatedTooltip label={folder.name}>
                    <button type="button" onClick={() => onNavigate(folder.folder_id)} className={CRUMB_CLASS}>
                      {folder.name}
                    </button>
                  </TruncatedTooltip>
                )}
              </span>
            );
          })}
        </>
      )}
    </nav>
  );
}
