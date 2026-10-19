import type { ReactNode } from "react";
import { LayoutGrid, List } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { cn } from "@/lib/utils";
import { useFoldersView, type FoldersViewMode } from "../../_hooks/use-folders-view";
import { FOLDER_GRID_CLASS, SECTION_LABEL_CLASS, SECTION_HEAD_CLASS } from "../sources-ui";

const HEAD_REVEAL_CLASS =
  "transition-opacity motion-reduce:transition-none [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/folders:pointer-events-auto [@media(hover:hover)]:group-hover/folders:opacity-100 group-focus-within/folders:pointer-events-auto group-focus-within/folders:opacity-100";

/** The card/list buttons: two bare 28px buttons for a section header, the active one a blue wash. */
function ViewSwitch({
  view,
  onChange,
  className,
}: {
  view: FoldersViewMode;
  onChange: (mode: FoldersViewMode) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Folder view" className={cn("flex shrink-0 items-center gap-0.5", className)}>
      {VIEW_OPTIONS.map(({ mode, label, Icon }) => (
        <IconButton
          key={mode}
          size="sm"
          label={label}
          aria-pressed={view === mode}
          onClick={() => onChange(mode)}
          className={cn(view === mode && "bg-accent text-primary hover:bg-accent hover:text-primary")}
        >
          <Icon className="size-3.5" />
        </IconButton>
      ))}
    </div>
  );
}

const VIEW_OPTIONS: { mode: FoldersViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { mode: "grid", label: "Card view", Icon: LayoutGrid },
  { mode: "list", label: "List view", Icon: List },
];

/** The folders under a header that names them, with a switch between cards (the default) and rows. The choice is
 * remembered. Always open: the files stack right below it. The header bar is always in place with its "Folders" label;
 * only the card/list switch waits for the pointer (or focus), so the folders never move. On touch the switch is always shown. */
export function FoldersSection({
  children,
}: {
  /** The folders, drawn for the chosen view. */
  children: (view: FoldersViewMode) => ReactNode;
}) {
  const { view, setView } = useFoldersView();

  return (
    <div className="group/folders mb-3">
      <div className={SECTION_HEAD_CLASS}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={SECTION_LABEL_CLASS}>Folders</span>
        </div>
        <ViewSwitch view={view} onChange={setView} className={HEAD_REVEAL_CLASS} />
      </div>
      <div className={cn(view === "grid" && FOLDER_GRID_CLASS)}>{children(view)}</div>
    </div>
  );
}
