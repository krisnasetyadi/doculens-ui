import type { ReactNode } from "react";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuLabel } from "@/components/action-menu";
import { MENU_LUCIDE, MenuIcon } from "@/components/ui/menu-icons";
import { cn } from "@/lib/utils";
import { useFoldersView, type FoldersViewMode } from "../../_hooks/use-folders-view";
import { FOLDER_GRID_CLASS, SECTION_LABEL_CLASS, SECTION_HEAD_CLASS } from "../sources-ui";

const VIEW_OPTIONS: { mode: FoldersViewMode; label: string; Icon: typeof LayoutGrid }[] = [
  { mode: "grid", label: "Cards", Icon: LayoutGrid },
  { mode: "list", label: "List", Icon: List },
];

/** The "View" button in the Files toolbar, next to Sort: always on screen, so it is plain that folders can be shown
 * as cards or rows. The icon on the button is the view in force; the menu lists both. On a phone the word is only
 * read out, leaving a 40px square beside the search field. */
export function FoldersViewMenu({ disabled }: { disabled?: boolean }) {
  const { view, setView } = useFoldersView();
  const ActiveIcon = view === "list" ? List : LayoutGrid;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled} className="max-sm:w-10 max-sm:px-0">
          <ActiveIcon className="size-3.5" />
          <span className="max-sm:sr-only">View</span>
          <span className="sr-only">{view === "list" ? "List" : "Cards"}</span>
        </Button>
      </DropdownMenuTrigger>
      <ActionMenuContent align="end">
        <ActionMenuLabel>Show folders as</ActionMenuLabel>
        {/* Like SharePoint's view menu: the view in force is marked by weight and a blue icon, not a check. */}
        {VIEW_OPTIONS.map(({ mode, label, Icon }) => {
          const active = view === mode;
          return (
            <ActionMenuItem key={mode} onSelect={() => setView(mode)} className={cn(active && "font-semibold")}>
              {active ? (
                <Icon {...MENU_LUCIDE} className="size-[15px] shrink-0 text-primary" />
              ) : (
                <MenuIcon><Icon {...MENU_LUCIDE} /></MenuIcon>
              )}
              {label}
              {active && <span className="sr-only">, selected</span>}
            </ActionMenuItem>
          );
        })}
      </ActionMenuContent>
    </DropdownMenu>
  );
}

/** The folders under a header that names them, drawn as cards (the default) or rows. The view is picked with
 * FoldersViewMenu in the toolbar above and remembered. Always open: the files stack right below it. */
export function FoldersSection({
  children,
}: {
  /** The folders, drawn for the chosen view. */
  children: (view: FoldersViewMode) => ReactNode;
}) {
  const { view } = useFoldersView();

  return (
    <div className="mb-3">
      <div className={SECTION_HEAD_CLASS}>
        <span className={SECTION_LABEL_CLASS}>Folders</span>
      </div>
      <div className={cn(view === "grid" && FOLDER_GRID_CLASS)}>{children(view)}</div>
    </div>
  );
}
