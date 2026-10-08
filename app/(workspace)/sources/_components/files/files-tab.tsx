import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { Plus, AlertCircle, ExternalLink, FolderPlus, FolderInput, Folder as FolderIcon, ChevronLeft, Trash2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilesListSkeleton, FolderCardsSkeleton } from "../source-connection-skeleton";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlainTextViewerSkeleton, PlainTextViewerTable } from "../plain-text-viewer-table";
import { EmptyState } from "@/components/empty-state";
import { FileRow } from "./file-row";
import { FolderChip } from "../folders/folder-chip";
import { FolderDialog } from "../folders/folder-dialog";
import { FolderDestinationDialog } from "../folders/folder-destination-dialog";
import { SortBar } from "../sort-bar";
import { MAX_FILES_PER_SECTION } from "../../_lib/source-files";
import { toggleSort } from "../../_lib/sort";
import type { SourceFile } from "../../_types/sources.type";
import { openAuthenticatedFile } from "@/features/sources/lib/source-file";
import type { useFilesTab } from "../../_hooks/use-files-tab";
import type { useSourceFolders } from "../../_hooks/use-source-folders";
import { useNativeFileDrag } from "@/hooks/use-native-file-drag";
import { useAuthStore } from "@/stores/auth-store";
import { useStorageUsage } from "@/hooks/use-storage-usage";
import { UploadLimitBanner } from "./upload-limit-banner";
import {
  CARD_CLASS,
  LIST_HEAD_CLASS,
  TOOLBAR_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "../sources-ui";
import { DANGER_OUTLINE_CLASS } from "@/lib/danger-styles";
import { STORAGE_FULL_NOTICE, formatBytes } from "@/lib/upload-limits";
import { MAX_FOLDER_DEPTH, canMoveFolder, childFolders, folderBreadcrumbs } from "../../_lib/source-folder-tree";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

/** A file is eligible for select/move/drag once it's a real, uploaded
 * collection — not a placeholder "uploading"/"error" row. */
const isEligible = (f: SourceFile) => f.status === "success" && !!f.collectionId;

type MoveRequest =
  | { kind: "file"; ids: string[] }
  | { kind: "folder"; folderId: string };

export function FilesTab({
  tab,
  folders,
  isAdmin,
  active,
}: {
  tab: ReturnType<typeof useFilesTab>;
  folders: ReturnType<typeof useSourceFolders>;
  isAdmin: boolean;
  active: boolean;
}) {
  const currentUserId = useAuthStore((state) => state.user?.user_id);
  const {
    filesInputRef,
    uploadNotice,
    dismissUploadNotice,
    loadingPdf,
    loadingChat,
    filesSort,
    setFilesSort,
    expandedPdfRows,
    combinedFileSources,
    filesAtMax,
    refreshFiles,
    handleFilesUpload,
    deletePdf,
    deleteChat,
    togglePdfActive,
    toggleChatActive,
    movePdfToFolder,
    moveChatToFolder,
    previewChat,
    loadMoreChatPreview,
    togglePdfRowExpansion,
    chatPreviewOpen,
    setChatPreviewOpen,
    chatPreviewLoading,
    chatPreviewError,
    chatPreviewFileName,
    chatPreviewSubtype,
    chatPreviewLines,
    chatPreviewTotal,
    chatPreviewHasMore,
    chatPreviewLoadingMore,
    previewText,
    loadMoreTextPreview,
    textPreviewOpen,
    setTextPreviewOpen,
    textPreviewLoading,
    textPreviewError,
    textPreviewFileName,
    textPreviewLines,
    textPreviewTotalLines,
    textPreviewHasMore,
    textPreviewLoadingMore,
  } = tab;

  const { usage: storage, limits } = useStorageUsage();
  // A refused upload's own reason wins; otherwise a full workspace says so
  // up front instead of waiting for someone to try.
  const bannerNotice = uploadNotice ?? (storage?.blocked ? STORAGE_FULL_NOTICE : null);
  const uploadBanner = bannerNotice && (
    <UploadLimitBanner
      notice={bannerNotice}
      isAdmin={isAdmin}
      onDismiss={uploadNotice ? dismissUploadNotice : undefined}
    />
  );

  const { folders: folderList, loadingFolders, currentFolderId, setCurrentFolderId, createFolder, renameFolder, deleteFolder } = folders;
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  // Where a Shift-click range starts: the last row clicked on its own.
  const selectionAnchorRef = useRef<string | null>(null);
  const [draggingFile, setDraggingFile] = useState<SourceFile | null>(null);
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // The panel highlight yields to the folder chip under the native file drag.
  const [hoveredDropFolderId, setHoveredDropFolderId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<MoveRequest | null>(null);
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedFolderId(null);
  }, [currentFolderId]);
  const currentFolder = folderList.find((f) => f.folder_id === currentFolderId);
  const breadcrumbs = folderBreadcrumbs(folderList, currentFolderId);
  const canCreateFolder = breadcrumbs.length < MAX_FOLDER_DEPTH
    && (!currentFolderId || currentFolder?.owner_id === currentUserId);
  const visibleFolders = childFolders(folderList, currentFolderId);
  const movingFolder = moveRequest?.kind === "folder"
    ? folderList.find((folder) => folder.folder_id === moveRequest.folderId)
    : undefined;
  const movingFile = moveRequest?.kind === "file" && moveRequest.ids.length === 1
    ? combinedFileSources.find((file) => file.id === moveRequest.ids[0])
    : undefined;
  const moveCurrentFolderId = movingFolder
    ? movingFolder.parent_folder_id ?? null
    : movingFile?.folderId ?? currentFolderId;
  const validMoveFolderIds = new Set(folderList
    .filter((folder) => movingFolder
      ? folder.owner_id === movingFolder.owner_id
        && folder.folder_id !== movingFolder.parent_folder_id
        && canMoveFolder(folderList, movingFolder.folder_id, folder.folder_id)
      : folder.folder_id !== moveCurrentFolderId)
    .map((folder) => folder.folder_id));

  // Root shows unassigned sources only; a folder shows just its own — this is
  // what keeps unassigned sources visible without opening any folder (MS-274).
  const visibleFileSources = combinedFileSources.filter((f) =>
    currentFolderId ? f.folderId === currentFolderId : !f.folderId,
  );
  const folderItemCount = (folderId: string) =>
    combinedFileSources.filter((f) => f.folderId === folderId).length + childFolders(folderList, folderId).length;

  const nothingAtAll = folderList.length === 0 && combinedFileSources.length === 0;
  // The skeleton is for the first load only. A refresh runs with the list already on screen
  // (moving a file, deleting a folder, ...) and must leave it alone, so it never shows then.
  // Folders load apart from files: while either is still on its first load with nothing to show,
  // the whole list is a skeleton, and if only the folders are late their cards hold their place.
  const showSkeleton =
    (loadingPdf || loadingChat || loadingFolders) && combinedFileSources.length === 0 && folderList.length === 0;
  const showFolderSkeleton = !showSkeleton && loadingFolders && folderList.length === 0;

  // ── Multi-select ─────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedFolderId(null);
  };
  const selectableVisible = visibleFileSources.filter(isEligible);
  /** File-manager selection: click selects just this one, Cmd/Ctrl-click adds
   * or removes it, Shift-click selects the range from the last click. */
  const handleSelect = (id: string, event: MouseEvent) => {
    setSelectedFolderId(null);
    if (event.shiftKey && selectionAnchorRef.current) {
      const ids = selectableVisible.map((f) => f.id);
      const from = ids.indexOf(selectionAnchorRef.current);
      const to = ids.indexOf(id);
      if (from !== -1 && to !== -1) {
        setSelectedIds(new Set(ids.slice(Math.min(from, to), Math.max(from, to) + 1)));
        return;
      }
    }
    selectionAnchorRef.current = id;
    if (event.metaKey || event.ctrlKey) {
      toggleSelect(id);
      return;
    }
    setSelectedIds(new Set([id]));
  };
  const selectFolder = (folderId: string) => {
    setSelectedIds(new Set());
    selectionAnchorRef.current = null;
    setSelectedFolderId(folderId);
  };
  // Escape clears the selection.
  useEffect(() => {
    if (selectedIds.size === 0 && !selectedFolderId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.size, selectedFolderId]);
  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((f) => selectedIds.has(f.id));

  const moveMany = async (ids: string[], folderId: string | null) => {
    const outcomes = await Promise.all(ids.map((id) => {
      const f = combinedFileSources.find((x) => x.id === id);
      if (!f || !isEligible(f)) return Promise.resolve(false);
      return (f.kind === "pdf" ? movePdfToFolder : moveChatToFolder)(f, folderId);
    }));
    clearSelection();
    return outcomes.every(Boolean);
  };
  const submitMove = async (folderId: string | null) => {
    if (!moveRequest) return false;
    if (moveRequest.kind === "folder") {
      if (!movingFolder) return false;
      try {
        await renameFolder(movingFolder, movingFolder.name, folderId);
        return true;
      } catch {
        return false;
      }
    }
    return moveMany(moveRequest.ids, folderId);
  };
  const deleteMany = async (ids: string[]) => {
    await Promise.all(ids.map((id) => {
      const f = combinedFileSources.find((x) => x.id === id);
      if (!f) return Promise.resolve(true);
      return (f.kind === "pdf" ? deletePdf : deleteChat)(f);
    }));
    clearSelection();
  };

  // ── Drag-to-folder ───────────────────────────────────────────────────────
  // Only folders already visible at this level are drop targets. The move
  // dialog handles destinations in other branches or levels.
  // A mouse starts a drag after moving a few pixels (so a click stays a click);
  // touch needs a short press-and-hold, so scrolling the list still works.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith("folder:")) {
      const folderId = activeId.slice("folder:".length);
      setDraggingFolder(visibleFolders.some((folder) => folder.folder_id === folderId) ? folderId : null);
      setDraggingFile(null);
      return;
    }
    const file = visibleFileSources.find((candidate) => candidate.id === activeId);
    setDraggingFile(file && isEligible(file) ? file : null);
    setDraggingFolder(null);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingFile(null);
    setDraggingFolder(null);
    const { active, over } = event;
    if (!over) return;
    const targetId = String(over.id);
    const target = visibleFolders.find((folder) => folder.folder_id === targetId);
    if (!target) return;

    const activeId = String(active.id);
    if (activeId.startsWith("folder:")) {
      const folderId = activeId.slice("folder:".length);
      const source = visibleFolders.find((folder) => folder.folder_id === folderId);
      if (!source || source.owner_id !== currentUserId || target.owner_id !== source.owner_id
        || !canMoveFolder(folderList, folderId, targetId)) return;
      void renameFolder(source, source.name, targetId).catch(() => {});
      return;
    }

    const file = visibleFileSources.find((candidate) => candidate.id === activeId);
    if (!file || !isEligible(file)) return;
    const ids = selectedIds.has(activeId) && selectedIds.size > 1 ? Array.from(selectedIds) : [activeId];
    void moveMany(ids, targetId);
  };

  // ── OS file drop ─────────────────────────────────────────────────────────
  // Covers root, an empty folder, and an open folder uniformly: it always
  // assigns to currentFolderId, which is null at root and the open folder's
  // id otherwise. Dropping directly on a folder chip (below) is the only
  // distinct case — it targets that chip's folder regardless of which view
  // is open, and stops this handler from also firing on the same drop.
  //
  // isContainerOver alone isn't enough to decide the panel highlight: a
  // chip's own dragover stops propagation, so this container's isOver
  // simply stops getting refreshed while hovering a chip — it doesn't get
  // cleared, since that same chip is still "contained" as far as this
  // container's own dragleave check is concerned. hoveredDropFolderId
  // (reported up by whichever chip is actually under the pointer) is what
  // makes the panel defer to that chip instead of both lighting up.
  const { isOver: isContainerOver, dragHandlers: containerDragHandlers } = useNativeFileDrag((files) =>
    handleFilesUpload(files, currentFolderId),
  );
  const showPanelDragHighlight = isContainerOver && !hoveredDropFolderId;

  return (
    <>
      {active && (
      <div
        {...containerDragHandlers}
        onClick={(event) => {
          // Portals bubble React events up to this container, so the delete confirm (its text and
          // backdrop) has to count as "inside", or a stray click clears the selection mid-delete.
          if (!(event.target as HTMLElement).closest("[data-row],button,a,input,[role=menuitem],[role=dialog],[role=alertdialog],[data-slot=alert-dialog-overlay],[data-slot=switch]")) clearSelection();
        }}
        className={`${CARD_CLASS} ${showPanelDragHighlight ? "border-primary ring-2 ring-primary/30" : ""}`}
      >
        {!showSkeleton && nothingAtAll ? (
          <>
          {uploadBanner}
          <EmptyState
            icon={<FileText />}
            heading="Your files will show up here"
            label={`Add a PDF, Word, CSV, Excel, or text file${isAdmin ? " (WhatsApp .txt exports work too)" : ""}, up to ${formatBytes(limits.maxFileBytes)} each. Then you can ask your assistant about it.`}
            onUpload={() => filesInputRef.current?.click()}
            secondaryAction={canCreateFolder ? (
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(true)}
                className={SECONDARY_BUTTON_CLASS}
              >
                <FolderPlus className="size-3.5" />
                New Folder
              </Button>
            ) : undefined}
          />
          </>
        ) : (
          <>
            <div className={TOOLBAR_CLASS}>
              {selectedIds.size > 0 ? (
                <div className="mr-auto flex flex-wrap items-center gap-2">
                  <span className="font-['Manrope'] text-xs font-semibold text-foreground">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() =>
                      allVisibleSelected
                        ? clearSelection()
                        : setSelectedIds(new Set(selectableVisible.map((f) => f.id)))
                    }
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {allVisibleSelected ? "Clear selection" : `Select all ${selectableVisible.length}`}
                  </button>
                </div>
              ) : (
                <nav aria-label="Folder breadcrumb" className="mr-auto flex min-w-0 items-center gap-2 overflow-x-auto font-['Manrope'] text-[13px] font-bold">
                  {currentFolder ? (
                    <>
                      <button onClick={() => setCurrentFolderId(null)} className="shrink-0 text-muted-foreground transition-colors hover:text-primary">
                        All files
                      </button>
                      {breadcrumbs.map((folder, index) => (
                        <span key={folder.folder_id} className="flex min-w-0 shrink-0 items-center gap-2">
                          <span className="text-muted-foreground/40">/</span>
                          <button
                            onClick={() => setCurrentFolderId(folder.folder_id)}
                            aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                            className={index === breadcrumbs.length - 1 ? "max-w-40 truncate text-foreground" : "max-w-40 truncate text-muted-foreground transition-colors hover:text-primary"}
                            title={folder.name}
                          >
                            {folder.name}
                          </button>
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="text-foreground">All files</span>
                  )}
                </nav>
              )}
              {selectedIds.size === 0 && visibleFileSources.length > 1 && (
                <SortBar
                  sort={filesSort}
                  onToggle={(k) => toggleSort(filesSort, k, setFilesSort)}
                />
              )}
              <div className="flex items-center gap-2 max-sm:w-full sm:shrink-0">
                {selectedIds.size > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setMoveRequest({ kind: "file", ids: Array.from(selectedIds) })}
                      className={SECONDARY_BUTTON_CLASS}
                    >
                      <FolderInput className="size-3.5" />
                      Move to folder
                    </Button>
                    <DeleteConfirmDialog
                      open={bulkDeleteOpen}
                      onOpenChange={setBulkDeleteOpen}
                      title={`Delete ${selectedIds.size} file${selectedIds.size === 1 ? "" : "s"}?`}
                      description="They'll be removed from your sources and can no longer be used to answer questions."
                      onConfirm={() => deleteMany(Array.from(selectedIds))}
                      trigger={
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className={`${SECONDARY_BUTTON_CLASS} ${DANGER_OUTLINE_CLASS}`}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSelection}
                      className="h-8 w-8 rounded-full shrink-0"
                      aria-label="Clear selection"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    {canCreateFolder && (
                      <Button
                        variant="outline"
                        onClick={() => setNewFolderOpen(true)}
                        className={SECONDARY_BUTTON_CLASS}
                      >
                        <FolderPlus className="size-3.5" />
                        New folder
                      </Button>
                    )}
                    <Button
                      disabled={showSkeleton || filesAtMax || storage?.blocked}
                      onClick={() => filesInputRef.current?.click()}
                      className={PRIMARY_BUTTON_CLASS}
                    >
                      <Plus className="size-3.5" />
                      Add files
                    </Button>
                  </>
                )}
              </div>
            </div>

            {filesAtMax && (
              <div role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>
                  <b className="font-semibold">{MAX_FILES_PER_SECTION} of {MAX_FILES_PER_SECTION} files</b> in this workspace
                  {" · "}You&apos;re at the current file limit
                </span>
              </div>
            )}

            {uploadBanner}

            {showSkeleton ? (
              <FilesListSkeleton />
            ) : (
            <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => { setDraggingFile(null); setDraggingFolder(null); }}>
              {showFolderSkeleton && <FolderCardsSkeleton />}
              {visibleFolders.length > 0 && (
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleFolders.map((folder) => (
                    <FolderChip
                      key={folder.folder_id}
                      folder={folder}
                      canManage={folder.owner_id === currentUserId}
                      canDrag={folder.owner_id === currentUserId && visibleFolders.some((target) =>
                        target.owner_id === currentUserId
                        && canMoveFolder(folderList, folder.folder_id, target.folder_id))}
                      canDrop={!draggingFolder || (folder.folder_id !== draggingFolder
                        && folder.owner_id === currentUserId
                        && canMoveFolder(folderList, draggingFolder, folder.folder_id))}
                      itemCount={folderItemCount(folder.folder_id)}
                      selected={selectedFolderId === folder.folder_id}
                      onSelect={() => selectFolder(folder.folder_id)}
                      parentName={folder.parent_folder_id
                        ? folderList.find((parent) => parent.folder_id === folder.parent_folder_id)?.name ?? "its parent"
                        : "All Files"}
                      onRequestMove={() => setMoveRequest({ kind: "folder", folderId: folder.folder_id })}
                      onOpen={() => setCurrentFolderId(folder.folder_id)}
                      onRename={(name) => renameFolder(folder, name)}
                      onDelete={() => { void deleteFolder(folder).then((deleted) => { if (deleted) refreshFiles(); }); }}
                      onDropFiles={(files) => handleFilesUpload(files, folder.folder_id)}
                      onDragActiveChange={(active) =>
                        setHoveredDropFolderId((prev) =>
                          active ? folder.folder_id : prev === folder.folder_id ? null : prev,
                        )
                      }
                    />
                  ))}
                </div>
              )}

              {visibleFileSources.length === 0 && visibleFolders.length === 0 ? (
                <EmptyState
                  icon={<FileText />}
                  heading={currentFolder ? "Nothing in this folder yet" : "No unassigned files"}
                  label={
                    currentFolder
                      ? "Add a file here, or move one in from another folder. Your assistant can use it as soon as it's ready."
                      : `Add a PDF, Word, CSV, Excel, or text file${isAdmin ? " (WhatsApp .txt exports work too)" : ""}, up to ${formatBytes(limits.maxFileBytes)} each. Then you can ask your assistant about it.`
                  }
                  onUpload={() => filesInputRef.current?.click()}
                  secondaryAction={
                    currentFolder ? (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentFolderId(currentFolder.parent_folder_id ?? null)}
                        className={SECONDARY_BUTTON_CLASS}
                      >
                        <ChevronLeft className="size-3.5" />
                        Back to {currentFolder.parent_folder_id
                          ? folderList.find((folder) => folder.folder_id === currentFolder.parent_folder_id)?.name ?? "parent"
                          : "All Files"}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div>
                  <div className={LIST_HEAD_CLASS}>File</div>
                  {visibleFileSources.map((f) => {
                    const isPdf = f.kind === "pdf";
                    const eligible = isEligible(f);
                    return (
                      <div key={f.id} className="border-b last:border-b-0">
                        <FileRow
                          file={f}
                          onDelete={() => (isPdf ? deletePdf(f) : deleteChat(f))}
                          isPdf={isPdf}
                          onPreview={
                            f.status !== "success" || !f.collectionId
                              ? undefined
                              : isPdf
                                ? f.rawFileName?.toLowerCase().endsWith(".txt")
                                  ? () => previewText(f)
                                  : undefined
                                : () => previewChat(f)
                          }
                          expanded={expandedPdfRows.has(f.id)}
                          onToggleExpand={() => togglePdfRowExpansion(f.id)}
                          onToggleActive={eligible ? () => (isPdf ? togglePdfActive(f) : toggleChatActive(f)) : undefined}
                          onRequestMove={eligible ? () => setMoveRequest({ kind: "file", ids: [f.id] }) : undefined}
                          selected={selectedIds.has(f.id)}
                          onSelect={eligible ? (event) => handleSelect(f.id, event) : undefined}
                          draggable={eligible && visibleFolders.length > 0}
                        />
                        {isPdf && expandedPdfRows.has(f.id) && f.linkedItems && f.linkedItems.length > 0 && (
                          <div className="mb-3 ml-14 mr-3 space-y-1 rounded-lg border bg-muted/30 px-3 py-2">
                            {f.linkedItems.map((item, idx) => (
                              <button
                                key={`${f.id}-${idx}-${item.url}`}
                                onClick={() => openAuthenticatedFile(item.url, item.name)}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors text-left"
                              >
                                <ExternalLink className="size-3" />
                                <span className="truncate">{item.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <DragOverlay modifiers={[snapCenterToCursor]}>
                {draggingFolder ? (
                  <div className="flex max-w-[220px] items-center gap-2 rounded-xl border border-primary/40 bg-card px-3 py-2 shadow-lg">
                    <FolderIcon className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-['Manrope'] text-xs font-bold text-foreground">
                      {folderList.find((folder) => folder.folder_id === draggingFolder)?.name}
                    </span>
                  </div>
                ) : draggingFile ? (
                  <div className="relative flex max-w-[220px] items-center gap-2 rounded-xl border border-primary/40 bg-card px-3 py-2 shadow-lg">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-['Manrope'] text-xs font-bold text-foreground">
                      {selectedIds.has(draggingFile.id) && selectedIds.size > 1
                        ? `${selectedIds.size} files`
                        : draggingFile.name}
                    </span>
                    {selectedIds.has(draggingFile.id) && selectedIds.size > 1 && (
                      <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {selectedIds.size}
                      </span>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            )}
          </>
        )}
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.csv,.xlsx,.txt"
          className="hidden"
          onChange={(e) => handleFilesUpload(e.target.files, currentFolderId)}
        />
      </div>
      )}

      <FolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} parentName={currentFolder?.name} onSubmit={createFolder} />

      {moveRequest && (
        <FolderDestinationDialog
          open
          onOpenChange={(open) => { if (!open) setMoveRequest(null); }}
          title={moveRequest.kind === "folder" ? "Move folder" : "Move to folder"}
          sourceName={movingFolder?.name ?? movingFile?.name ?? `${moveRequest.kind === "file" ? moveRequest.ids.length : 0} files`}
          folders={folderList}
          currentFolderId={moveCurrentFolderId}
          validFolderIds={validMoveFolderIds}
          onMove={submitMove}
        />
      )}

      <Dialog open={chatPreviewOpen} onOpenChange={setChatPreviewOpen}>
        <DialogContent showCloseButton={false} className="max-h-[90dvh] w-[95vw] max-w-[95vw] grid-cols-1 overflow-y-auto sm:max-w-3xl">
          <DialogClose className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="min-w-0 pr-8 text-left">
            <DialogTitle className="truncate font-['Manrope'] text-[15px] font-bold leading-tight text-foreground">{chatPreviewSubtype === "whatsapp" ? "Chat preview" : "Text preview"}: {chatPreviewFileName}</DialogTitle>
          </DialogHeader>
          {!chatPreviewLoading && !chatPreviewError && (
            <div className="flex items-center gap-2 flex-wrap -mt-2">
              <Badge variant="secondary" className="bg-primary/10 text-[10px] font-semibold text-primary">TXT</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-[10px] font-semibold text-primary">
                {chatPreviewSubtype === "whatsapp" ? "WhatsApp export" : "Plain text"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {chatPreviewTotal.toLocaleString("en-US")} {chatPreviewSubtype === "whatsapp"
                  ? (chatPreviewTotal === 1 ? "message" : "messages")
                  : (chatPreviewTotal === 1 ? "line" : "lines")}
              </span>
            </div>
          )}
          {chatPreviewLoading ? (
            <PlainTextViewerSkeleton />
          ) : chatPreviewError ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-destructive">{chatPreviewError}</p>
            </div>
          ) : (
            <PlainTextViewerTable
              lines={chatPreviewLines}
              total={chatPreviewTotal}
              hasMore={chatPreviewHasMore}
              loadingMore={chatPreviewLoadingMore}
              onLoadMore={loadMoreChatPreview}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={textPreviewOpen} onOpenChange={setTextPreviewOpen}>
        <DialogContent showCloseButton={false} className="max-h-[90dvh] w-[95vw] max-w-[95vw] grid-cols-1 overflow-y-auto sm:max-w-3xl">
          <DialogClose className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="min-w-0 pr-8 text-left">
            <DialogTitle className="truncate font-['Manrope'] text-[15px] font-bold leading-tight text-foreground">Text preview: {textPreviewFileName}</DialogTitle>
          </DialogHeader>
          {!textPreviewLoading && !textPreviewError && (
            <div className="flex items-center gap-2 flex-wrap -mt-2">
              <Badge variant="secondary" className="bg-primary/10 text-[10px] font-semibold text-primary">TXT</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-[10px] font-semibold text-primary">Plain text</Badge>
              <span className="text-[11px] text-muted-foreground">
                {textPreviewTotalLines.toLocaleString("en-US")} {textPreviewTotalLines === 1 ? "line" : "lines"}
              </span>
            </div>
          )}
          {textPreviewLoading ? (
            <PlainTextViewerSkeleton />
          ) : textPreviewError ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-destructive">{textPreviewError}</p>
            </div>
          ) : (
            <PlainTextViewerTable
              lines={textPreviewLines}
              total={textPreviewTotalLines}
              hasMore={textPreviewHasMore}
              loadingMore={textPreviewLoadingMore}
              onLoadMore={loadMoreTextPreview}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
