import { Loader2, Plus, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "./empty-state";
import { FileRow } from "./file-row";
import { SortBar } from "./sort-bar";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_SECTION, openAuthenticatedFile, toggleSort } from "./sources-types";
import type { useFilesTab } from "@/hooks/use-files-tab";

export function FilesTab({ tab, isAdmin, active }: { tab: ReturnType<typeof useFilesTab>; isAdmin: boolean; active: boolean }) {
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

  return (
    <>
      {active && (
      <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
        {loadingPdf || loadingChat ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
          </div>
        ) : combinedFileSources.length === 0 ? (
          <EmptyState
            icon={<span className="material-symbols-outlined text-5xl leading-none">description</span>}
            label={`Upload a PDF${isAdmin ? " or WhatsApp .txt export" : " to get started"} (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB each)`}
            onUpload={() => filesInputRef.current?.click()}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <SortBar
                sort={filesSort}
                onToggle={(k) => toggleSort(filesSort, k, setFilesSort)}
              />
              <div className="flex items-center gap-2 sm:shrink-0">
                {filesAtMax && (
                  <span className="flex items-center gap-1 text-xs text-amber-500 font-['Inter']">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Max {MAX_FILES_PER_SECTION} files reached
                  </span>
                )}
                <Button
                  disabled={filesAtMax}
                  onClick={() => filesInputRef.current?.click()}
                  className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs"
                >
                  <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  Upload File
                </Button>
              </div>
            </div>
            <div className="space-y-2.5">
              {combinedFileSources.map((f) => {
                const isPdf = f.kind === "pdf";
                return (
                  <div key={f.id} className="space-y-1.5">
                    <FileRow
                      file={f}
                      onDelete={() => (isPdf ? deletePdf(f) : deleteChat(f))}
                      isPdf={isPdf}
                      onPreview={!isPdf && f.status === "success" && !!f.collectionId ? () => previewChat(f) : undefined}
                      expanded={expandedPdfRows.has(f.id)}
                      onToggleExpand={() => togglePdfRowExpansion(f.id)}
                      onToggleActive={
                        f.status === "success" && f.collectionId
                          ? () => (isPdf ? togglePdfActive(f) : toggleChatActive(f))
                          : undefined
                      }
                    />
                    {isPdf && expandedPdfRows.has(f.id) && f.linkedItems && f.linkedItems.length > 0 && (
                      <div className="ml-9 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 space-y-1">
                        {f.linkedItems.map((item, idx) => (
                          <button
                            key={`${f.id}-${idx}-${item.url}`}
                            onClick={() => openAuthenticatedFile(item.url)}
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
          </>
        )}
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept={isAdmin ? ".pdf,.txt" : ".pdf"}
          className="hidden"
          onChange={(e) => handleFilesUpload(e.target.files)}
        />
      </div>
      )}

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
