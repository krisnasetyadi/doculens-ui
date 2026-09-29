import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Folder as FolderIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useNativeFileDrag } from "@/hooks/use-native-file-drag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FolderDialog } from "./folder-dialog";
import type { Folder } from "@/services";

export function FolderChip({
  folder,
  itemCount,
  onOpen,
  onRename,
  onDelete,
  onDropFiles,
  onDragActiveChange,
}: {
  folder: Folder;
  itemCount: number;
  onOpen: () => void;
  onRename: (name: string) => Promise<void> | void;
  onDelete: () => void;
  /** OS file(s) dropped directly onto this chip — uploads straight into this
   * folder, no separate "move to folder" step. */
  onDropFiles: (files: FileList) => void;
  /** Reports this chip's own native-drag-over state up to the Files tab, so
   * it can suppress its own root-level highlight while a chip is claiming
   * the drop — only one drop target should ever appear active at once. */
  onDragActiveChange: (active: boolean) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { isOver, setNodeRef } = useDroppable({ id: folder.folder_id });
  const { isOver: isNativeOver, dragHandlers } = useNativeFileDrag(onDropFiles);

  useEffect(() => {
    onDragActiveChange(isNativeOver);
  }, [isNativeOver, onDragActiveChange]);

  return (
    <>
      <div
        ref={setNodeRef}
        {...dragHandlers}
        className={`group relative flex items-center gap-2 pl-3 pr-2 py-2.5 rounded-xl bg-card hover:bg-muted/30 transition-colors border ${isOver || isNativeOver ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border/60"}`}
      >
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 flex items-center gap-2 text-left focus:outline-none"
        >
          <FolderIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold font-['Manrope'] text-foreground" title={folder.name}>
            {folder.name}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground/60 font-['Inter']">
            {itemCount}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted focus:outline-none"
              aria-label="Folder actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setRenameOpen(true)} className="gap-2 cursor-pointer">
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FolderDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={folder.name}
        onSubmit={onRename}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Manrope'] font-extrabold">
              Delete this folder?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-['Inter']">
              {`"${folder.name}" will be removed. Files inside it are not deleted — they move back to the root and stay usable as sources.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
