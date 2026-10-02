import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Loader2, Plus, AlertCircle, ExternalLink, FolderPlus, FolderInput, Folder as FolderIcon, ChevronLeft, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PlainTextViewerTable } from "./plain-text-viewer-table";
import { EmptyState } from "./empty-state";
import { FileRow } from "./file-row";
import { FolderChip } from "./folder-chip";
import { FolderDialog } from "./folder-dialog";
import { FolderDestinationDialog } from "./folder-destination-dialog";
import { SortBar } from "./sort-bar";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_SECTION, openAuthenticatedFile, toggleSort, type SourceFile } from "./sources-types";
import type { useFilesTab } from "@/hooks/use-files-tab";
import type { useSourceFolders } from "@/hooks/use-source-folders";
import { useNativeFileDrag } from "@/hooks/use-native-file-drag";
import { useAuthStore } from "@/stores/auth-store";
import { MAX_FOLDER_DEPTH, canMoveFolder, childFolders, folderBreadcrumbs } from "@/lib/source-folder-tree";

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

  const { folders: folderList, currentFolderId, setCurrentFolderId, createFolder, renameFolder, deleteFolder } = folders;
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingFile, setDraggingFile] = useState<SourceFile | null>(null);
  const [draggingFolder, setDraggingFolder] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  // The panel highlight yields to the folder chip under the native file drag.
  const [hoveredDropFolderId, setHoveredDropFolderId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<MoveRequest | null>(null);
  useEffect(() => setSelectedIds(new Set()), [currentFolderId]);
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

  // ── Multi-select ─────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());
  const selectableVisible = visibleFileSources.filter(isEligible);
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
  const deleteMany = (ids: string[]) => {
    ids.forEach((id) => {
      const f = combinedFileSources.find((x) => x.id === id);
      if (!f) return;
      (f.kind === "pdf" ? deletePdf : deleteChat)(f);
    });
    clearSelection();
  };

  // ── Drag-to-folder ───────────────────────────────────────────────────────
  // Only folders already visible at this level are drop targets. The move
  // dialog handles destinations in other branches or levels.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
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
        className={`rounded-2xl border bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6 transition-colors ${showPanelDragHighlight ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}
      >
        {loadingPdf || loadingChat ? (
          <div role="status" className="space-y-4">
            <span className="sr-only">Memuat daftar file…</span>
            <div className="flex items-center justify-between gap-3" aria-hidden="true">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : nothingAtAll ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-5xl leading-none">description</span>}
            label={`Upload a PDF, Word, CSV, Excel, or text file${isAdmin ? " (WhatsApp .txt exports supported too)" : ""} (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB each)`}
            onUpload={() => filesInputRef.current?.click()}
            secondaryAction={canCreateFolder ? (
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(true)}
                className="rounded-xl font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            <div className={currentFolder && selectedIds.size === 0
              ? "grid grid-cols-1 gap-3 mb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              : "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"}>
              {selectedIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-['Manrope'] font-semibold text-foreground">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() =>
                      allVisibleSelected
                        ? clearSelection()
                        : setSelectedIds(new Set(selectableVisible.map((f) => f.id)))
                    }
                    className="text-xs font-['Inter'] font-medium text-primary hover:underline"
                  >
                    {allVisibleSelected ? "Clear selection" : `Select all ${selectableVisible.length}`}
                  </button>
                </div>
              ) : currentFolder ? (
                <nav aria-label="Folder breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-x-auto text-sm font-['Manrope'] font-semibold">
                  <button onClick={() => setCurrentFolderId(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    All Files
                  </button>
                  {breadcrumbs.map((folder, index) => (
                    <span key={folder.folder_id} className="flex items-center gap-1.5 min-w-0 shrink-0">
                      <span className="text-muted-foreground/40">/</span>
                      <button
                        onClick={() => setCurrentFolderId(folder.folder_id)}
                        aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                        className={index === breadcrumbs.length - 1 ? "text-foreground truncate max-w-32" : "text-muted-foreground hover:text-foreground truncate max-w-32"}
                        title={folder.name}
                      >
                        {folder.name}
                      </button>
                    </span>
                  ))}
                </nav>
              ) : (
                <SortBar
                  sort={filesSort}
                  onToggle={(k) => toggleSort(filesSort, k, setFilesSort)}
                />
              )}
              <div className="flex items-center gap-2 sm:shrink-0">
                {selectedIds.size > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setMoveRequest({ kind: "file", ids: Array.from(selectedIds) })}
                      className="h-11 sm:h-8 rounded-xl font-['Manrope'] font-semibold gap-1.5 border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm sm:text-xs"
                    >
                      <FolderInput className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      Move to folder
                    </Button>
                    <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-11 sm:h-8 rounded-xl font-['Manrope'] font-semibold gap-1.5 border-border text-red-500 hover:text-red-600 hover:border-red-300 text-sm sm:text-xs"
                        >
                          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-['Manrope'] font-extrabold">
                            Delete {selectedIds.size} file{selectedIds.size === 1 ? "" : "s"}?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="font-['Inter']">
                            They&apos;ll be removed from your sources and can no longer be used to answer questions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-['Manrope'] font-semibold">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteMany(Array.from(selectedIds));
                              setBulkDeleteOpen(false);
                            }}
                            className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-['Manrope'] font-bold"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSelection}
                      className="h-8 w-8 rounded-full shrink-0"
                      aria-label="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {filesAtMax && (
                      <span className="flex items-center gap-1 text-xs text-amber-500 font-['Inter']">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Max {MAX_FILES_PER_SECTION} files reached
                      </span>
                    )}
                    {canCreateFolder && (
                      <Button
                        variant="outline"
                        onClick={() => setNewFolderOpen(true)}
                        className="h-11 sm:h-8 rounded-xl font-['Manrope'] font-semibold gap-1.5 border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm sm:text-xs"
                      >
                        <FolderPlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        New Folder
                      </Button>
                    )}
                    <Button
                      disabled={filesAtMax}
                      onClick={() => filesInputRef.current?.click()}
                      className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs"
                    >
                      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      Upload File
                    </Button>
                  </>
                )}
              </div>
              {currentFolder && selectedIds.size === 0 && (
                <div className="sm:col-span-2">
                  <SortBar
                    sort={filesSort}
                    onToggle={(k) => toggleSort(filesSort, k, setFilesSort)}
                  />
                </div>
              )}
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => { setDraggingFile(null); setDraggingFolder(null); }}>
              {visibleFolders.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
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
                  icon={<span className="material-symbols-outlined text-5xl leading-none">description</span>}
                  heading={currentFolder ? "This folder is empty" : "No unassigned files"}
                  label={
                    currentFolder
                      ? "Upload a file here, move one from its menu, or drag one onto this folder."
                      : `Upload a PDF, Word, CSV, Excel, or text file${isAdmin ? " (WhatsApp .txt exports supported too)" : ""} (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB each)`
                  }
                  onUpload={() => filesInputRef.current?.click()}
                  secondaryAction={
                    currentFolder ? (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentFolderId(currentFolder.parent_folder_id ?? null)}
                        className="rounded-xl font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back to {currentFolder.parent_folder_id
                          ? folderList.find((folder) => folder.folder_id === currentFolder.parent_folder_id)?.name ?? "parent"
                          : "All Files"}
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-3">
                  {visibleFileSources.map((f) => {
                    const isPdf = f.kind === "pdf";
                    const eligible = isEligible(f);
                    return (
                      <div key={f.id} className="space-y-1.5">
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
                          onToggleSelect={eligible ? () => toggleSelect(f.id) : undefined}
                          draggable={eligible && visibleFolders.length > 0}
                        />
                        {isPdf && expandedPdfRows.has(f.id) && f.linkedItems && f.linkedItems.length > 0 && (
                          <div className="ml-9 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 space-y-1">
                            {f.linkedItems.map((item, idx) => (
                              <button
                                key={`${f.id}-${idx}-${item.url}`}
                                onClick={() => openAuthenticatedFile(item.url, item.name)}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors text-left"
                              >
                                <ExternalLink className="h-3 w-3" />
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

              <DragOverlay>
                {draggingFolder ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-primary shadow-lg">
                    <FolderIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-['Manrope'] font-semibold text-foreground truncate max-w-[220px]">
                      {folderList.find((folder) => folder.folder_id === draggingFolder)?.name}
                    </span>
                  </div>
                ) : draggingFile ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-primary shadow-lg">
                    <span className="text-sm font-['Manrope'] font-semibold text-foreground truncate max-w-[220px]">
                      {selectedIds.has(draggingFile.id) && selectedIds.size > 1
                        ? `${selectedIds.size} files`
                        : draggingFile.name}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
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
        <DialogContent showCloseButton={false} className="grid-cols-1 max-h-[90dvh] max-w-[95vw] w-[95vw] overflow-y-auto rounded-2xl border-border/60 bg-card shadow-xl sm:max-w-3xl">
          <DialogClose className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="min-w-0 pr-8 text-left">
            <DialogTitle className="font-['Manrope'] text-xl font-extrabold leading-tight tracking-tight text-foreground truncate">{chatPreviewSubtype === "whatsapp" ? "Chat preview" : "Text preview"}: {chatPreviewFileName}</DialogTitle>
          </DialogHeader>
          {!chatPreviewLoading && !chatPreviewError && (
            <div className="flex items-center gap-2 flex-wrap -mt-2">
              <Badge variant="secondary" className="rounded-lg bg-primary/10 font-['Manrope'] font-bold text-primary">TXT</Badge>
              <Badge variant="secondary" className="rounded-lg bg-primary/10 font-['Manrope'] font-bold text-primary">
                {chatPreviewSubtype === "whatsapp" ? "WhatsApp export" : "Plain text"}
              </Badge>
              <span className="text-xs text-muted-foreground font-['Inter']">
                {chatPreviewTotal.toLocaleString("en-US")} {chatPreviewSubtype === "whatsapp"
                  ? (chatPreviewTotal === 1 ? "message" : "messages")
                  : (chatPreviewTotal === 1 ? "line" : "lines")}
              </span>
            </div>
          )}
          {chatPreviewLoading ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview…
            </div>
          ) : chatPreviewError ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-red-500">{chatPreviewError}</p>
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
        <DialogContent showCloseButton={false} className="grid-cols-1 max-h-[90dvh] max-w-[95vw] w-[95vw] overflow-y-auto rounded-2xl border-border/60 bg-card shadow-xl sm:max-w-3xl">
          <DialogClose className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="min-w-0 pr-8 text-left">
            <DialogTitle className="font-['Manrope'] text-xl font-extrabold leading-tight tracking-tight text-foreground truncate">Text preview: {textPreviewFileName}</DialogTitle>
          </DialogHeader>
          {!textPreviewLoading && !textPreviewError && (
            <div className="flex items-center gap-2 flex-wrap -mt-2">
              <Badge variant="secondary" className="rounded-lg bg-primary/10 font-['Manrope'] font-bold text-primary">TXT</Badge>
              <Badge variant="secondary" className="rounded-lg bg-primary/10 font-['Manrope'] font-bold text-primary">Plain text</Badge>
              <span className="text-xs text-muted-foreground font-['Inter']">
                {textPreviewTotalLines.toLocaleString("en-US")} {textPreviewTotalLines === 1 ? "line" : "lines"}
              </span>
            </div>
          )}
          {textPreviewLoading ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview…
            </div>
          ) : textPreviewError ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-sm text-red-500">{textPreviewError}</p>
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
