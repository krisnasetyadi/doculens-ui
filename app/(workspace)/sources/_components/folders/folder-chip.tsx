import { useEffect, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Folder as FolderIcon, FolderInput } from "lucide-react";
import { useNativeFileDrag } from "@/hooks/use-native-file-drag";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu";
import {
} from "@/lib/menu-styles";
import { DeleteGlyph, DotsGlyph, MENU_LUCIDE, MenuIcon, RenameGlyph } from "@/components/ui/menu-icons";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { FolderDialog } from "./folder-dialog";
import type { Folder } from "@/services/source-folders/type/source-folder.type";
import {
  FOLDER_CARD_CLASS,
  ROW_REVEAL_CLASS,
} from "../sources-ui";
import { IconButton } from "@/components/icon-button";

export function FolderChip({
  folder,
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
        className={`${FOLDER_CARD_CLASS} cursor-default select-none pr-2 outline-none focus-visible:border-primary/40 ${selected ? "border-primary/40 bg-accent" : ""} ${isOver || isNativeOver ? "border-primary bg-primary/5 ring-2 ring-primary/30" : ""} ${isDragging ? "opacity-40" : ""}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <FolderIcon className="size-[18px] shrink-0 text-primary/80" />
          <span className="truncate font-manrope text-[13px] font-bold text-foreground" title={folder.name}>
            {folder.name}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
        {canManage && <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton
              size="sm"
              label="Folder actions"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className={`${ROW_REVEAL_CLASS}`}
            >
              <DotsGlyph />
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
        </DropdownMenu>}
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
