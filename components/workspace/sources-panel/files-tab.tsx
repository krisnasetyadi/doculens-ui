import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Loader2, Plus, AlertCircle, ExternalLink, FolderPlus, FolderInput, ChevronLeft, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "./empty-state";
import { FileRow } from "./file-row";
import { FolderChip } from "./folder-chip";
import { FolderDialog } from "./folder-dialog";
import { SortBar } from "./sort-bar";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_SECTION, openAuthenticatedFile, toggleSort, type SourceFile } from "./sources-types";
import type { useFilesTab } from "@/hooks/use-files-tab";
import type { useSourceFolders } from "@/hooks/use-source-folders";

/** A file is eligible for select/move/drag once it's a real, uploaded
 * collection — not a placeholder "uploading"/"error" row. */
const isEligible = (f: SourceFile) => f.status === "success" && !!f.collectionId;

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
  const {
    filesInputRef,
    loadingPdf,
    loadingChat,
    filesSort,
    setFilesSort,
    expandedPdfRows,
    combinedFileSources,
    filesAtMax,
    handleFilesUpload,
    deletePdf,
    deleteChat,
    togglePdfActive,
    toggleChatActive,
    movePdfToFolder,
    moveChatToFolder,
    previewChat,
    togglePdfRowExpansion,
    chatPreviewOpen,
    setChatPreviewOpen,
    chatPreviewLoading,
    chatPreviewError,
    chatPreviewText,
    chatPreviewFileName,
    chatPreviewTruncated,
  } = tab;

  const { folders: folderList, currentFolderId, setCurrentFolderId, createFolder, renameFolder, deleteFolder } = folders;
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingFile, setDraggingFile] = useState<SourceFile | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const currentFolder = folderList.find((f) => f.folder_id === currentFolderId);

  // Root shows unassigned sources only; a folder shows just its own — this is
  // what keeps unassigned sources visible without opening any folder (MS-274).
  const visibleFileSources = combinedFileSources.filter((f) =>
    currentFolderId ? f.folderId === currentFolderId : !f.folderId,
  );
  const folderItemCount = (folderId: string) =>
    combinedFileSources.filter((f) => f.folderId === folderId).length;

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

  const moveMany = (ids: string[], folderId: string | null) => {
    ids.forEach((id) => {
      const f = combinedFileSources.find((x) => x.id === id);
      if (!f || !isEligible(f)) return;
      (f.kind === "pdf" ? movePdfToFolder : moveChatToFolder)(f, folderId);
    });
    clearSelection();
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
  // Only enabled at the root view (currentFolder == null), where folder
  // chips exist as drop targets. Dragging a file that's part of the active
  // selection moves the whole selection, matching Drive/Explorer behavior.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragStart = (event: DragStartEvent) => {
    const f = combinedFileSources.find((x) => x.id === event.active.id);
    setDraggingFile(f ?? null);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingFile(null);
    const { active, over } = event;
    if (!over) return;
    const draggedId = String(active.id);
    const folderId = String(over.id);
    const ids = selectedIds.has(draggedId) && selectedIds.size > 1 ? Array.from(selectedIds) : [draggedId];
    moveMany(ids, folderId);
  };

  return (
    <>
      {active && (
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
        {loadingPdf || loadingChat ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
          </div>
        ) : nothingAtAll ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-5xl leading-none">description</span>}
            label={`Upload a PDF, Word, CSV, Excel, or text file${isAdmin ? " (WhatsApp .txt exports supported too)" : ""} (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB each)`}
            onUpload={() => filesInputRef.current?.click()}
            secondaryAction={
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(true)}
                className="rounded-xl font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className="flex items-center gap-1.5 text-sm font-['Manrope'] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  All Files
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-foreground">{currentFolder.name}</span>
                </button>
              ) : (
                <SortBar
                  sort={filesSort}
                  onToggle={(k) => toggleSort(filesSort, k, setFilesSort)}
                />
              )}
              <div className="flex items-center gap-2 sm:shrink-0">
                {selectedIds.size > 0 ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-11 sm:h-8 rounded-xl font-['Manrope'] font-semibold gap-1.5 border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm sm:text-xs"
                        >
                          <FolderInput className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          Move to folder
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {folderList.length === 0 ? (
                          <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
                        ) : (
                          folderList.map((folder) => (
                            <DropdownMenuItem
                              key={folder.folder_id}
                              onSelect={() => moveMany(Array.from(selectedIds), folder.folder_id)}
                              className="cursor-pointer"
                            >
                              {folder.name}
                            </DropdownMenuItem>
                          ))
                        )}
                        {currentFolder && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => moveMany(Array.from(selectedIds), null)}
                              className="cursor-pointer"
                            >
                              Remove from folder
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <Button
                      variant="outline"
                      onClick={() => setNewFolderOpen(true)}
                      className="h-11 sm:h-8 rounded-xl font-['Manrope'] font-semibold gap-1.5 border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm sm:text-xs"
                    >
                      <FolderPlus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      New Folder
                    </Button>
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
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {!currentFolder && folderList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                  {folderList.map((folder) => (
                    <FolderChip
                      key={folder.folder_id}
                      folder={folder}
                      itemCount={folderItemCount(folder.folder_id)}
                      onOpen={() => setCurrentFolderId(folder.folder_id)}
                      onRename={(name) => renameFolder(folder, name)}
                      onDelete={() => deleteFolder(folder)}
                    />
                  ))}
                </div>
              )}

              {visibleFileSources.length === 0 ? (
                <EmptyState
                  icon={<span className="material-symbols-outlined text-5xl leading-none">description</span>}
                  heading={currentFolder ? "This folder is empty" : "No unassigned files"}
                  label={
                    currentFolder
                      ? "New uploads land in your unassigned files first — move one in from the \"...\" menu on any file, or upload here and move it in after."
                      : `Upload a PDF, Word, CSV, Excel, or text file${isAdmin ? " (WhatsApp .txt exports supported too)" : ""} (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB each)`
                  }
                  onUpload={() => filesInputRef.current?.click()}
                  secondaryAction={
                    currentFolder ? (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentFolderId(null)}
                        className="rounded-xl font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back to All Files
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
                          onPreview={!isPdf && f.status === "success" && !!f.collectionId ? () => previewChat(f) : undefined}
                          expanded={expandedPdfRows.has(f.id)}
                          onToggleExpand={() => togglePdfRowExpansion(f.id)}
                          onToggleActive={eligible ? () => (isPdf ? togglePdfActive(f) : toggleChatActive(f)) : undefined}
                          folders={folderList}
                          onMoveToFolder={
                            eligible
                              ? (folderId) => (isPdf ? movePdfToFolder(f, folderId) : moveChatToFolder(f, folderId))
                              : undefined
                          }
                          selected={selectedIds.has(f.id)}
                          onToggleSelect={eligible ? () => toggleSelect(f.id) : undefined}
                          draggable={eligible && !currentFolder}
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
                {draggingFile ? (
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
          onChange={(e) => handleFilesUpload(e.target.files)}
        />
      </div>
      )}

      <FolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} onSubmit={createFolder} />

      <Dialog open={chatPreviewOpen} onOpenChange={setChatPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="font-['Manrope'] font-extrabold truncate">Preview Chat: {chatPreviewFileName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4">
            {chatPreviewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preview…
              </div>
            ) : chatPreviewError ? (
              <p className="text-sm text-red-500">{chatPreviewError}</p>
            ) : (
              <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words font-mono text-foreground/90">
                {chatPreviewText || "No content available."}
              </pre>
            )}
          </div>
          {chatPreviewTruncated && (
            <p className="text-xs text-muted-foreground">Preview dipotong ke 20,000 karakter pertama.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
