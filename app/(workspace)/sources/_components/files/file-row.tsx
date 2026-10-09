import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronRight, ChevronDown, ExternalLink, Eye, FolderInput } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu";
import {
} from "@/lib/menu-styles";
import { DeleteGlyph, DotsGlyph, MENU_LUCIDE, MenuIcon } from "@/components/ui/menu-icons";
import { cn } from "@/lib/utils";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { SourceFileTypeIcon } from "./source-file-type-icon";
import { getFileTypeLabel } from "@/lib/file-type";
import { API_BASE, getSourceFileTypeLabel } from "../../_lib/source-files";
import type { SourceFile } from "../../_types/sources.type";
import { openAuthenticatedFile } from "@/features/sources/lib/source-file";
import { UPLOAD_STAGE_LABELS } from "@/services/upload-progress";
import {
  ROW_CLASS,
  ROW_META_CLASS,
} from "../sources-ui";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { IconButton } from "@/components/icon-button";

const NAME_CLASS = "min-w-0 truncate font-manrope text-[13px] font-bold leading-5 text-foreground";

/** Stops a click, press or touch on a row's own controls (switch, menu) from
 * also selecting the row or starting a drag. */
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

export function FileRow({
  file,
  onDelete,
  isPdf = false,
  onPreview,
  onToggleExpand,
  expanded,
  onToggleActive,
  onRequestMove,
  selected,
  onSelect,
  draggable = false,
}: {
  file: SourceFile;
  onDelete: () => Promise<boolean | void> | void;
  isPdf?: boolean;
  onPreview?: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
  onToggleActive?: () => void;
  onRequestMove?: () => void;
  /** Whether this row is part of the current selection. */
  selected?: boolean;
  /** One click selects (the parent reads Shift / Cmd / Ctrl from the event for
   * ranges and multi-select). Omitted means the row can't be selected yet,
   * e.g. while it is still uploading. */
  onSelect?: (event: MouseEvent) => void;
  /** Drag the row onto a folder card to move it, like a file manager. */
  draggable?: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const coarse = useCoarsePointer();
  const isInactive = file.status === "success" && file.active === false;
  const typeLabel = file.kind === "chat" ? "WhatsApp" : getFileTypeLabel(file.rawFileName);
  // A pdf-kind .txt (a plain-text document, not a WhatsApp export, see
  // NOT_CHAT_EXPORT in use-files-tab.ts) gets the formatted text viewer
  // (onPreview) instead of the raw-open-in-a-new-tab behavior below (MS-415).
  const isTxt = file.rawFileName?.toLowerCase().endsWith(".txt") ?? false;
  const hasLinked = isPdf && !!file.linkedItems?.length;

  /** Double-click (or a single tap on touch): the same thing the file name
   * used to do as a button. */
  const open: (() => void) | undefined =
    isPdf && !isTxt && file.status === "success" && file.rawFileName
      ? () => {
          if (file.collectionId && file.rawFileName) {
            const url = `${API_BASE}/api/v1/files/${file.collectionId}/${encodeURIComponent(file.rawFileName)}`;
            openAuthenticatedFile(url, file.rawFileName);
          }
        }
      : hasLinked
        ? onToggleExpand
        : onPreview;

  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: file.id,
    disabled: !draggable,
  });

  const handleClick = (event: MouseEvent) => {
    if (coarse && open) {
      open();
      return;
    }
    onSelect?.(event);
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" && open) {
      event.preventDefault();
      open();
    } else if (event.key === " " && onSelect) {
      event.preventDefault();
      onSelect(event as unknown as MouseEvent);
    }
  };

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? listeners : {})}
      data-row=""
      data-selected={selected ? "" : undefined}
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={coarse ? undefined : open}
      onKeyDown={handleKeyDown}
      className={cn(
        ROW_CLASS,
        "cursor-default select-none border-b-0 outline-none focus-visible:bg-accent/50",
        selected && "bg-accent hover:bg-accent",
        isDragging && "opacity-40",
      )}
    >
      <SourceFileTypeIcon
        type={getSourceFileTypeLabel(file)}
        status={file.status}
        finishedAt={file.finishedAt}
        progress={file.progress}
        stage={file.stage}
      />
      <div className={cn("min-w-0 flex-1", isInactive && "opacity-60")}>
        <div className="flex min-w-0 items-center gap-1.5">
          {hasLinked && (
            <IconButton
              size="sm"
              label={expanded ? "Collapse linked files" : "Expand linked files"}
              onClick={(e) => {
                stop(e);
                onToggleExpand?.();
              }}
              onMouseDown={stop}
              onTouchStart={stop}
              className="shrink-0"
            >
              {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </IconButton>
          )}
          <p className={NAME_CLASS} title={file.name}>
            {file.name}
          </p>
        </div>
        {file.status === "uploading" ? (
          <div className="mt-1 space-y-1">
            <Progress value={file.progress ?? 0} className="h-1" />
            <p className={cn(ROW_META_CLASS, "tabular-nums")}>
              {`${UPLOAD_STAGE_LABELS[file.stage ?? "reading"]} · ${file.progress ?? 0}%`}
            </p>
          </div>
        ) : file.status === "error" ? (
          <p className="text-[11px] leading-4 text-destructive">Upload failed</p>
        ) : (
          <p className={cn(ROW_META_CLASS, "mt-0.5 flex flex-wrap items-center gap-x-1.5")}>
            {typeLabel && <span className="font-medium">{typeLabel}</span>}
            {typeLabel && <span aria-hidden="true">·</span>}
            <span>
              {file.uploadedAt.format("DD MMM YYYY")}
              <span className="hidden sm:inline">{file.uploadedAt.format(", HH:mm")}</span>
            </span>
            {file.status === "success" && file.meta && (
              <>
                <span aria-hidden="true">·</span>
                <span>{file.meta}</span>
              </>
            )}
            {file.status === "success" && file.linkedItems && file.linkedItems.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{file.linkedItems.length} linked</span>
              </>
            )}
          </p>
        )}
      </div>
      <div
        className="flex shrink-0 items-center gap-3"
        onClick={stop}
        onDoubleClick={stop}
        onMouseDown={stop}
        onTouchStart={stop}
      >
        {onToggleActive && (
          <Switch
            disabled={file.status !== "success"}
            checked={file.active !== false}
            onCheckedChange={onToggleActive}
            className="relative shrink-0 max-sm:after:absolute max-sm:after:-inset-x-1 max-sm:after:-inset-y-[11px] max-sm:after:content-['']"
            aria-label={file.active !== false ? "Deactivate source" : "Activate source"}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton size="sm" label="File actions" >
              <DotsGlyph />
            </IconButton>
          </DropdownMenuTrigger>
          <ActionMenuContent>
            {open && (
              <ActionMenuItem onSelect={open}>
                <MenuIcon>
                  {onPreview && !(isPdf && !isTxt) ? <Eye {...MENU_LUCIDE} /> : <ExternalLink {...MENU_LUCIDE} />}
                </MenuIcon>
                {hasLinked ? (expanded ? "Collapse" : "Show linked files") : onPreview && !(isPdf && !isTxt) ? "Preview" : "Open"}
              </ActionMenuItem>
            )}
            {onRequestMove && (
              <ActionMenuItem onSelect={onRequestMove}>
                <MenuIcon><FolderInput {...MENU_LUCIDE} /></MenuIcon>
                Move to folder...
              </ActionMenuItem>
            )}
            {(open || onRequestMove) && <ActionMenuSeparator />}
            <ActionMenuItem
              onSelect={() => setDeleteOpen(true)}
              danger
            >
              <MenuIcon danger><DeleteGlyph /></MenuIcon>
              Delete
            </ActionMenuItem>
          </ActionMenuContent>
        </DropdownMenu>
      </div>
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Do you want to delete this file?"
        description={`"${file.name}" will be removed from your sources and can no longer be used to answer questions.`}
        onConfirm={onDelete}
        contentProps={{ onClick: stop, onDoubleClick: stop }}
      />
    </div>
  );
}
