import { useEffect, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Folder as FolderIcon, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile } from "@/components/icon-tile";
import { useNativeFileDrag } from "@/hooks/use-native-file-drag";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu";
import { DeleteGlyph, DotsGlyph, MENU_LUCIDE, MenuIcon, RenameGlyph } from "@/components/ui/menu-icons";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { FolderDialog } from "./folder-dialog";
import type { Folder } from "@/services/source-folders/type/source-folder.type";
import { FOLDER_CARD_CLASS, FOLDER_ROW_CLASS } from "../sources-ui";
import type { FoldersViewMode } from "../../_hooks/use-folders-view";
import { IconButton } from "@/components/icon-button";
import { TruncatedTooltip } from "@/components/truncated-tooltip";

export function FolderChip({
  folder,
  view = "grid",
  location,
  canManage,
  canDrag,
  canDrop,
  itemCount,
  parentName,
  selected,
  onSelect,
  onRequestMove,
  onOpen,
  onRename,
  onDelete,
  onDropFiles,
  onDragActiveChange,
}: {
  folder: Folder;
  /** A card (the default) or a slim row; the Folders header switches it. Behavior is the same in both. */
  view?: FoldersViewMode;
  /** Set on a search result: the folder it sits in, shown after the item count. */
  location?: string;
  canManage: boolean;
  canDrag: boolean;
  canDrop: boolean;
  itemCount: number;
  parentName: string;
  /** One click selects the folder (a highlight); double-click opens it, like a file manager. */
  selected?: boolean;
  onSelect?: () => void;
  onRequestMove: () => void;
  onOpen: () => void;
  onRename: (name: string) => Promise<void> | void;
  onDelete: () => Promise<boolean | void> | void;
  /** OS files dropped onto this chip are assigned to this folder after upload. */
  onDropFiles: (files: FileList) => void;
  /** Reports this chip's own native-drag-over state up to the Files tab, so
   * it can suppress the panel highlight while a chip is claiming
   * the drop — only one drop target should ever appear active at once. */
  onDragActiveChange: (active: boolean) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: folder.folder_id,
    disabled: !canDrop,
  });
  const coarse = useCoarsePointer();
  const { listeners, setNodeRef: setDragNodeRef, isDragging } = useDraggable({
    id: `folder:${folder.folder_id}`,
    disabled: !canDrag,
  });
  const { isOver: isNativeOver, dragHandlers } = useNativeFileDrag(onDropFiles);

  useEffect(() => {
    onDragActiveChange(isNativeOver);
  }, [isNativeOver, onDragActiveChange]);

  return (
    <>
      <div
        ref={(node) => { setDropNodeRef(node); setDragNodeRef(node); }}
        {...dragHandlers}
        {...(canDrag ? listeners : {})}
        data-row=""
        tabIndex={0}
        onClick={() => (coarse ? onOpen() : onSelect?.())}
        onDoubleClick={coarse ? undefined : onOpen}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && event.key === "Enter") onOpen();
        }}
        className={cn(
          view === "grid" ? FOLDER_CARD_CLASS : FOLDER_ROW_CLASS,
          "cursor-default select-none outline-none",
          view === "grid" ? "focus-visible:border-primary/40" : "focus-visible:bg-accent/50",
          selected && (view === "grid" ? "border-primary/40 bg-accent hover:bg-accent" : "bg-accent hover:bg-accent"),
          (isOver || isNativeOver) &&
            (view === "grid" ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-primary/5 ring-2 ring-inset ring-primary/30"),
          isDragging && "opacity-40",
        )}
      >
        {view === "grid" ? (
          <>
            <IconTile tone="primary">
              <FolderIcon className="size-[18px]" />
            </IconTile>
            <span className="min-w-0 flex-1">
              <TruncatedTooltip label={folder.name}>
                <span className="block truncate font-manrope text-[13.5px] font-semibold leading-5 text-foreground">
                  {folder.name}
                </span>
              </TruncatedTooltip>
              <span className="block truncate text-[11.5px] leading-4 text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}{location && ` · in ${location}`}
              </span>
            </span>
          </>
        ) : (
          <>
            {/* The icon is centred in a slot as wide as the file rows' type tile, so its centre is on the same line as
                the file icons' and the names line up down the list. */}
            <span className="flex w-9 shrink-0 justify-center">
              <FolderIcon className="size-[18px] text-primary/80" />
            </span>
            <TruncatedTooltip label={folder.name}>
              <span className="min-w-0 flex-1 truncate font-manrope text-[13.5px] font-semibold leading-5 text-foreground">
                {folder.name}
              </span>
            </TruncatedTooltip>
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}{location && ` · in ${location}`}
            </span>
          </>
        )}
        {canManage ? <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              size="sm"
              label="Folder actions"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <DotsGlyph vertical />
            </IconButton>
          </DropdownMenuTrigger>
          <ActionMenuContent>
            <ActionMenuItem onSelect={() => setRenameOpen(true)}>
              <MenuIcon><RenameGlyph /></MenuIcon>
              Rename
            </ActionMenuItem>
            <ActionMenuItem onSelect={onRequestMove}>
              <MenuIcon><FolderInput {...MENU_LUCIDE} /></MenuIcon>
              Move folder...
            </ActionMenuItem>
            <ActionMenuSeparator />
            <ActionMenuItem
              onSelect={() => setDeleteOpen(true)}
              danger
            >
              <MenuIcon danger><DeleteGlyph /></MenuIcon>
              Delete
            </ActionMenuItem>
          </ActionMenuContent>
        </DropdownMenu> : <span aria-hidden="true" className="size-7 shrink-0" />}
      </div>

      <FolderDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={folder.name}
        onSubmit={onRename}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this folder?"
        description={`"${folder.name}" will be removed. Its files and subfolders will move to ${parentName}; none will be deleted.`}
        onConfirm={onDelete}
      />
    </>
  );
}
