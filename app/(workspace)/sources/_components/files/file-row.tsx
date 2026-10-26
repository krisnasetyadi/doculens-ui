import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronRight, ChevronDown, ExternalLink, Eye, FolderInput, ShieldCheck, ShieldOff } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionMenuContent, ActionMenuItem, ActionMenuSeparator } from "@/components/action-menu";
import { DeleteGlyph, DotsGlyph, MENU_LUCIDE, MenuIcon } from "@/components/ui/menu-icons";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/date";
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
import { TruncatedTooltip } from "@/components/truncated-tooltip";

const NAME_CLASS = "min-w-0 truncate font-manrope text-[13.5px] font-semibold leading-5 text-foreground";

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
  onToggleReferenceFramework,
  selected,
  onSelect,
  selectionMode = false,
  onToggleSelect,
  draggable = false,
  location,
}: {
  file: SourceFile;
  onDelete: () => Promise<boolean | void> | void;
  isPdf?: boolean;
  onPreview?: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
  onToggleActive?: () => void;
  onRequestMove?: () => void;
  /** Flags or unflags the file as a Gap Check reference framework (MS-848). */
  onToggleReferenceFramework?: () => void;
  /** Whether this row is part of the current selection. */
  selected?: boolean;
  /** One click selects (the parent reads Shift / Cmd / Ctrl from the event for
   * ranges and multi-select). Omitted means the row can't be selected yet,
   * e.g. while it is still uploading. */
  onSelect?: (event: MouseEvent) => void;
  /** Something is selected, so every row shows a checkbox for picking more by hand. */
  selectionMode?: boolean;
  /** Toggles this row in or out of the selection, keeping the rest. Omitted for a row that can't be selected. */
  onToggleSelect?: () => void;
  /** Drag the row onto a folder card to move it, like a file manager. */
  draggable?: boolean;
  /** Set on a search result: the folder it lives in, shown after the other details. */
  location?: string;
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

  const checkbox = (
    <>
      {/* While anything is selected (or on a touch screen, where a tap opens the file instead of selecting
          it) each row gets a checkbox beside it, so a selection can be built by hand. A row that can't be
          selected keeps an empty slot, so the icons stay in one column. */}
      {(selectionMode || coarse) &&
        (onToggleSelect ? (
          <span
            className="flex shrink-0 items-center"
            onClick={stop}
            onDoubleClick={stop}
            onMouseDown={stop}
            onTouchStart={stop}
            onKeyDown={stop}
          >
            <Checkbox
              checked={selected ?? false}
              onCheckedChange={onToggleSelect}
              aria-label={`Select ${file.name}`}
              className="relative max-sm:after:absolute max-sm:after:-inset-3 max-sm:after:content-['']"
            />
          </span>
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        ))}
    </>
  );
  const typeIcon = (
      <SourceFileTypeIcon
        type={getSourceFileTypeLabel(file)}
        status={file.status}
        finishedAt={file.finishedAt}
        progress={file.progress}
        stage={file.stage}
      />
  );
  const nameLine = (
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
          <TruncatedTooltip label={file.name}>
            <p className={NAME_CLASS}>{file.name}</p>
          </TruncatedTooltip>
        </div>
  );
  const detailLine = file.status === "uploading" ? (
          <div className="mt-1 space-y-1">
            <Progress value={file.progress ?? 0} className="h-1" />
            <p className={cn(ROW_META_CLASS, "tabular-nums")}>
              {`${UPLOAD_STAGE_LABELS[file.stage ?? "reading"]} · ${file.progress ?? 0}%`}
            </p>
          </div>
        ) : file.status === "error" ? (
          <p className="text-[11px] leading-4 text-destructive">Upload failed</p>
        ) : (
          <p className={cn(ROW_META_CLASS, "mt-0.5", "flex flex-wrap items-center gap-x-1.5")}>
            {typeLabel && <span className="font-medium">{typeLabel}</span>}
            {typeLabel && <span aria-hidden="true">·</span>}
            <span>
              <span className="sm:hidden">{formatDate(file.uploadedAt)}</span>
              <span className="hidden sm:inline">{formatDateTime(file.uploadedAt)}</span>
            </span>
            {file.status === "success" && file.meta && (
              <>
                <span aria-hidden="true">·</span>
                <span>{file.meta}</span>
              </>
            )}
            {file.status === "success" && file.referenceFramework && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <ShieldCheck aria-hidden="true" className="size-3" />
                  Reference framework
                </span>
              </>
            )}
            {file.status === "success" && file.linkedItems && file.linkedItems.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{file.linkedItems.length} linked</span>
              </>
            )}
            {location && (
              <>
                <span aria-hidden="true">·</span>
                <span className="max-w-40 truncate">in {location}</span>
              </>
            )}
          </p>
        );
  const info = (
      <div className={cn("min-w-0 flex-1", isInactive && "opacity-60")}>
        {nameLine}
        {detailLine}
      </div>
  );
  const switchControl = (
    <>
        {onToggleActive && (
          <Switch
            disabled={file.status !== "success"}
            checked={file.active !== false}
            onCheckedChange={onToggleActive}
            className="relative shrink-0 max-sm:after:absolute max-sm:after:-inset-x-1 max-sm:after:-inset-y-[11px] max-sm:after:content-['']"
            aria-label={file.active !== false ? "Deactivate source" : "Activate source"}
          />
        )}
    </>
  );
  const menuControl = (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton size="sm" label="File actions" >
              <DotsGlyph vertical />
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
            {onToggleReferenceFramework && file.status === "success" && (
              <ActionMenuItem onSelect={onToggleReferenceFramework}>
                <MenuIcon>
                  {file.referenceFramework ? <ShieldOff {...MENU_LUCIDE} /> : <ShieldCheck {...MENU_LUCIDE} />}
                </MenuIcon>
                {file.referenceFramework ? "Remove reference framework" : "Mark as reference framework"}
              </ActionMenuItem>
            )}
            {(open || onRequestMove || onToggleReferenceFramework) && <ActionMenuSeparator />}
            <ActionMenuItem
              onSelect={() => setDeleteOpen(true)}
              danger
            >
              <MenuIcon danger><DeleteGlyph /></MenuIcon>
              Delete
            </ActionMenuItem>
          </ActionMenuContent>
        </DropdownMenu>
  );
  const controls = (
      <div
        className="flex shrink-0 items-center gap-3"
        onClick={stop}
        onDoubleClick={stop}
        onMouseDown={stop}
        onTouchStart={stop}
      >
        {switchControl}
        {menuControl}
      </div>
  );
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
        "cursor-default select-none outline-none focus-visible:bg-accent/50",
        selected && "bg-accent hover:bg-accent",
        isDragging && "opacity-40",
      )}
    >
      {checkbox}
      {typeIcon}
      {info}
      {controls}
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
