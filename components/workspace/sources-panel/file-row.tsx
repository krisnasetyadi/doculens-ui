import { Trash2, ChevronRight, ChevronDown, ExternalLink, Eye, MoreVertical, FolderInput, FolderMinus, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusIcon } from "./status-icon";
import { API_BASE, openAuthenticatedFile, type SourceFile } from "./sources-types";
import type { Folder } from "@/services";

export function FileRow({
  file,
  onDelete,
  isPdf = false,
  onPreview,
  onToggleExpand,
  expanded,
  onToggleActive,
  folders,
  onMoveToFolder,
  selected,
  onToggleSelect,
  draggable = false,
}: {
  file: SourceFile;
  onDelete: () => void;
  isPdf?: boolean;
  onPreview?: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
  onToggleActive?: () => void;
  /** Folders this file can be moved into (MS-274) — omitted where folders
   * aren't in scope (only the Files tab passes these). */
  folders?: Folder[];
  onMoveToFolder?: (folderId: string | null) => void;
  /** Multi-select (checkbox) — omitted entirely hides the checkbox. */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Drag-to-folder — only meaningful at the Files tab root, where folder
   * chips exist as drop targets (see FolderChip). */
  draggable?: boolean;
}) {
  const isInactive = file.status === "success" && file.active === false;
  const accent =
    file.status === "uploading" ? "bg-primary" : file.status === "error" ? "bg-red-400" : isInactive ? "bg-muted-foreground/30" : "bg-emerald-500";
  const iconWrap =
    file.status === "uploading" ? "bg-primary/10" : file.status === "error" ? "bg-red-500/10" : isInactive ? "bg-muted" : "bg-emerald-500/10";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: file.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      className={`relative flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl bg-card hover:bg-muted/30 group transition-colors border border-border/60 overflow-hidden ${isDragging ? "opacity-40" : ""}`}
    >
      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${accent}`} />
      {draggable && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 h-8 w-4 -mr-1 flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none focus:outline-none"
          aria-label="Drag to move into a folder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {onToggleSelect && (
        <Checkbox
          checked={!!selected}
          onCheckedChange={() => onToggleSelect()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0"
          aria-label={selected ? "Deselect file" : "Select file"}
        />
      )}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconWrap}`}>
        <StatusIcon status={file.status} />
      </div>
      <div className="flex-1 min-w-0">
        {isPdf && file.status === "success" && file.rawFileName ? (
          <button
            onClick={() => {
              if (file.collectionId && file.rawFileName) {
                const url = `${API_BASE}/api/v1/files/${file.collectionId}/${encodeURIComponent(file.rawFileName)}`;
                openAuthenticatedFile(url);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={file.name}
          >
            <ExternalLink className="h-3 w-3 shrink-0 inline opacity-70 text-primary" />
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
          </button>
        ) : isPdf && file.linkedItems?.length ? (
          <button
            onClick={onToggleExpand}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={file.name}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
          </button>
        ) : onPreview ? (
          <button
            onClick={onPreview}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={`Preview ${file.name}`}
          >
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
            <Eye className="h-3 w-3 shrink-0 inline opacity-0 group-hover:opacity-70 transition-opacity text-primary" />
          </button>
        ) : (
          <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate" title={file.name}>
            {file.name}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {file.kind && (
            <span className="text-[10px] font-['Inter'] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {file.kind === "pdf" ? "PDF" : "WhatsApp"}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/60 font-['Inter']">
            {file.uploadedAt.format("DD MMM YYYY, HH:mm")}
          </span>
          {file.status === "success" && file.meta && (
            <span className="text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
              {file.meta}
            </span>
          )}
          {file.status === "success" && file.linkedItems && file.linkedItems.length > 0 && (
            <span className="text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
              {file.linkedItems.length} linked
            </span>
          )}
          {file.status === "error" && (
            <span className="text-[11px] text-red-400 font-['Inter']">Upload failed</span>
          )}
        </div>
      </div>
      {onToggleActive && (
        <Switch
          checked={file.active !== false}
          onCheckedChange={onToggleActive}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0"
          aria-label={file.active !== false ? "Deactivate source" : "Activate source"}
        />
      )}
      {onMoveToFolder && folders && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onPointerDown={(e) => e.stopPropagation()}
              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full shrink-0 text-muted-foreground/50 hover:text-foreground"
              aria-label="Move to folder"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {folders.length === 0 ? (
              <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
            ) : (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <FolderInput className="h-3.5 w-3.5" />
                  Move to folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.folder_id}
                      disabled={file.folderId === folder.folder_id}
                      onSelect={() => onMoveToFolder(folder.folder_id)}
                      className="cursor-pointer"
                    >
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {file.folderId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onMoveToFolder(null)} className="gap-2 cursor-pointer">
                  <FolderMinus className="h-3.5 w-3.5" />
                  Remove from folder
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onPointerDown={(e) => e.stopPropagation()}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Manrope'] font-extrabold">
              Do you want to delete this file?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-['Inter']">
              {`"${file.name}" will be removed from your sources and can no longer be used to answer questions.`}
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
    </div>
  );
}
