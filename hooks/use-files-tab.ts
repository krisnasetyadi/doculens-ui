import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { PdfCollectionApi } from "@/services/resources/pdf-collection-api";
import { ChatCollectionApi } from "@/services/resources/chat-collection-api";
import type {
  PdfCollection,
  UploadResponse,
  ChatCollection,
  ChatCollectionPreviewResponse,
  ChatUploadResponse,
  DeleteResponse,
} from "@/services";
import {
  MAX_FILES_PER_SECTION,
  MAX_FILE_SIZE_BYTES,
  type SortState,
  type SourceFile,
  type UploadOutcome,
} from "@/components/workspace/sources-panel/sources-types";

export function useFilesTab({
  isAdmin,
  onPdfCollectionsChange,
  onChatCollectionsChange,
}: {
  isAdmin: boolean;
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
}) {
  const { toast } = useToast();
  const filesInputRef = useRef<HTMLInputElement>(null);

  const {
    cachedPdfFiles,
    cachedChatFiles,
    setCachedPdfFiles,
    setCachedChatFiles,
  } = useWorkspaceStore();

  const [pdfFiles, setPdfFiles] = useState<SourceFile[]>(
    () => cachedPdfFiles.map((f) => ({ ...f, uploadedAt: dayjs(f.uploadedAt) })),
  );
  const [chatFiles, setChatFiles] = useState<SourceFile[]>(
    () => cachedChatFiles.map((f) => ({ ...f, uploadedAt: dayjs(f.uploadedAt) })),
  );
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [filesSort, setFilesSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [expandedPdfRows, setExpandedPdfRows] = useState<Set<string>>(new Set());
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);
  const [chatPreviewLoading, setChatPreviewLoading] = useState(false);
  const [chatPreviewError, setChatPreviewError] = useState<string | null>(null);
  const [chatPreviewText, setChatPreviewText] = useState("");
  const [chatPreviewFileName, setChatPreviewFileName] = useState("");
  const [chatPreviewTruncated, setChatPreviewTruncated] = useState(false);

  // ── Load existing collections from API ──────────────────────────────────
  const fetchPdf = () => {
    setLoadingPdf(true);
    PdfCollectionApi.list<PdfCollection[]>()
      .then((data) => {
        const apiFiles: SourceFile[] = data.map((col) => {
          const rawName = col.file_names?.[0] ?? "";
          return {
            id: col.collection_id,
            name:
              col.title?.trim() ||
              (rawName
                ?.replace(/\.(pdf|doc|docx|csv|xlsx|txt)$/i, "")
                .replace(/[_-]/g, " ") ?? "Untitled"),
            uploadedAt: dayjs(col.created_at),
            status: "success",
            collectionId: col.collection_id,
            meta: `${col.document_count} doc${col.document_count !== 1 ? "s" : ""}`,
            rawFileName: rawName,
            title: col.title,
            active: col.status !== "inactive",
            kind: "pdf",
          };
        });

        const connectedOnlyFiles: SourceFile[] = cachedPdfFiles
          .filter((file) => !file.collectionId)
          .map((file) => ({
            ...file,
            uploadedAt: dayjs(file.uploadedAt),
          }));

        const mergedFiles: SourceFile[] = [
          ...apiFiles,
          ...connectedOnlyFiles.filter(
            (connected) => !apiFiles.some((apiFile) => apiFile.id === connected.id),
          ),
        ];

        setPdfFiles(mergedFiles);
        setCachedPdfFiles(mergedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          uploadedAt: f.uploadedAt.toISOString(),
          status: f.status,
          collectionId: f.collectionId,
          meta: f.meta,
          rawFileName: f.rawFileName,
          title: f.title,
          linkedItems: f.linkedItems,
          kind: f.kind,
        })));
        onPdfCollectionsChange?.(
          mergedFiles.filter((f) => f.collectionId && f.active !== false).map((f) => f.collectionId!),
        );
      })
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to load PDF collections",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingPdf(false));
  };

  const fetchChat = () => {
    setLoadingChat(true);
    ChatCollectionApi.list<
      { collections: ChatCollection[]; count: number } | ChatCollection[]
    >()
      .then((raw) => {
        const data: ChatCollection[] = Array.isArray(raw)
          ? raw
          : (raw as any).collections ?? [];
        // Telegram-sourced collections are shown via their connection (Chat
        // tab), not as loose rows here — otherwise they'd appear twice.
        const files: SourceFile[] = data
          .filter((col: any) => (col.platform ?? "whatsapp") !== "telegram")
          .map((col: any) => ({
            id: col.collection_id,
            name: col.filename ?? col.file_name ?? "Untitled",
            uploadedAt: col.created_at ? dayjs(col.created_at) : dayjs(),
            status: "success",
            collectionId: col.collection_id,
            meta: `${col.message_count ?? 0} messages · ${col.platform ?? ""}`,
            active: col.status !== "inactive",
            kind: "chat",
          }));
        setChatFiles(files);
        setCachedChatFiles(files.map((f) => ({ ...f, uploadedAt: f.uploadedAt.toISOString() })));
        onChatCollectionsChange?.(
          files.filter((f) => f.collectionId && f.active !== false).map((f) => f.collectionId!),
        );
      })
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to load chat collections",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingChat(false));
  };

  useEffect(() => {
    fetchPdf();
    // Chat is an admin-only source — fetching it for everyone else just
    // trips the backend's role check and surfaces confusing error toasts.
    if (isAdmin) {
      fetchChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    setCachedPdfFiles(
      pdfFiles.map((file) => ({
        id: file.id,
        name: file.name,
        uploadedAt: file.uploadedAt.toISOString(),
        status: file.status,
        collectionId: file.collectionId,
        meta: file.meta,
        rawFileName: file.rawFileName,
        title: file.title,
        linkedItems: file.linkedItems,
        kind: file.kind,
      })),
    );
  }, [pdfFiles, setCachedPdfFiles]);

  // ── Validation ───────────────────────────────────────────────────────────
  const validateFile = (
    file: File,
    accepted: string,
    existing: SourceFile[],
  ): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const acceptedExts = accepted
      .split(",")
      .map((a) => a.trim().replace(".", ""));
    if (!acceptedExts.includes(ext)) return "File not supported";
    if (file.size > MAX_FILE_SIZE_BYTES)
      return `File is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB)`;
    if (existing.some((f) => f.name === file.name || f.name === file.name.replace(/\.\w+$/, "")))
      return "File name already exists";
    if (existing.filter((f) => f.status !== "error").length >= MAX_FILES_PER_SECTION)
      return `Maximum ${MAX_FILES_PER_SECTION} files per section`;
    return null;
  };

  // ── Upload result ────────────────────────────────────────────────────────
  /** Report a finished batch in one toast. The row's status dot already tells
   * the story once you're looking at the list; this is the confirmation for
   * everyone who clicked Upload and looked away. */
  const reportUpload = (outcomes: UploadOutcome[]) => {
    if (outcomes.length === 0) return;

    const failed = outcomes.filter((o) => o.error);
    const uploaded = outcomes.length - failed.length;

    if (failed.length === 0) {
      toast({
        title:
          uploaded === 1
            ? "File uploaded successfully"
            : `${uploaded} files uploaded successfully`,
        description:
          uploaded === 1
            ? `"${outcomes[0].name}" is ready to use as a source.`
            : "All files are ready to use as sources.",
        variant: "success",
      });
      return;
    }

    // Name what went wrong per file — with a batch, a bare "Upload failed"
    // leaves people guessing which one to fix and retry.
    toast({
      title:
        uploaded > 0
          ? `${uploaded} of ${outcomes.length} files uploaded`
          : failed.length === 1
            ? "Upload failed"
            : "Uploads failed",
      description: failed.map((f) => `"${f.name}" — ${f.error}`).join(" · "),
      variant: "destructive",
    });
  };

  // ── Document upload (PDF, DOC, DOCX, CSV, XLSX — and plain .txt, see handleFilesUpload) ──
  const handlePdfUpload = (files: File[]): Promise<UploadOutcome[]> =>
    Promise.all(
      files.map((file): Promise<UploadOutcome> => {
        const err = validateFile(file, ".pdf,.doc,.docx,.csv,.xlsx,.txt", [...pdfFiles, ...chatFiles]);
        if (err) return Promise.resolve({ name: file.name, error: err });

        const tempId = `uploading-${Date.now()}-${file.name}`;
        const placeholder: SourceFile = {
          id: tempId,
          name: file.name.replace(/\.(pdf|doc|docx|csv|xlsx|txt)$/i, ""),
          uploadedAt: dayjs(),
          status: "uploading",
          kind: "pdf",
        };
        setPdfFiles((prev) => [placeholder, ...prev]);

        const formData = new FormData();
        formData.append("files", file);
        return PdfCollectionApi.upload<UploadResponse>(formData, { persist_mode: "database" })
          .then((data) => {
            setPdfFiles((prev) =>
              prev.map((f) =>
                f.id === tempId
                  ? {
                      ...f,
                      id: data.collection_id,
                      status: "success",
                      collectionId: data.collection_id,
                      meta: `${data.file_count} doc${data.file_count !== 1 ? "s" : ""}`,
                      rawFileName: file.name,
                    }
                  : f,
              ),
            );
            return { name: file.name };
          })
          .catch(() => {
            setPdfFiles((prev) =>
              prev.map((f) =>
                f.id === tempId ? { ...f, status: "error" } : f,
              ),
            );
            return { name: file.name, error: "Upload failed" };
          });
      }),
    );

  // ── Chat upload ──────────────────────────────────────────────────────────
  // A .txt that doesn't actually parse as a WhatsApp export rejects with a
  // NOT_CHAT_EXPORT marker (instead of resolving with a generic error) so
  // handleFilesUpload can catch it and silently retry the same file as a
  // plain text document — that's the "auto-detect from content" behavior.
  const handleChatUpload = (file: File): Promise<UploadOutcome> => {
    const err = validateFile(file, ".txt", [...pdfFiles, ...chatFiles]);
    if (err) return Promise.resolve({ name: file.name, error: err });

    const tempId = `uploading-${Date.now()}-${file.name}`;
    const placeholder: SourceFile = {
      id: tempId,
      name: file.name,
      uploadedAt: dayjs(),
      status: "uploading",
      kind: "chat",
    };
    setChatFiles((prev) => [placeholder, ...prev]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "whatsapp");
    return ChatCollectionApi.upload<ChatUploadResponse>(formData)
      .then((data) => {
        setChatFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  id: data.collection_id,
                  status: "success",
                  collectionId: data.collection_id,
                  meta: `${data.message_count} messages`,
                }
              : f,
          ),
        );
        return { name: file.name };
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "";
        if (message.toLowerCase().includes("no messages found")) {
          // Not a WhatsApp export after all — drop the chat placeholder, the
          // caller will re-upload this same file as a plain document instead.
          setChatFiles((prev) => prev.filter((f) => f.id !== tempId));
          return Promise.reject(new Error("NOT_CHAT_EXPORT"));
        }
        setChatFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" } : f,
          ),
        );
        return { name: file.name, error: "Upload failed" };
      });
  };

  // ── Merged Files-tab upload — PDF/DOCX/CSV/XLSX/TXT for everyone. A .txt
  // is auto-detected server-side: admins get it checked against the WhatsApp
  // export parser first (falling back to a plain document if it doesn't
  // match); non-admins go straight to the plain-document path, since the
  // WhatsApp-specific pipeline stays admin-only regardless of content. ──
  const handleFilesUpload = (files: FileList | null) => {
    if (!files) return;
    const pdfs: File[] = [];
    const others: Promise<UploadOutcome>[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf" || ext === "doc" || ext === "docx" || ext === "csv" || ext === "xlsx") {
        pdfs.push(file);
      } else if (ext === "txt") {
        if (isAdmin) {
          others.push(
            handleChatUpload(file).catch((err) =>
              err instanceof Error && err.message === "NOT_CHAT_EXPORT"
                ? handlePdfUpload([file]).then((outcomes) => outcomes[0])
                : { name: file.name, error: "Upload failed" },
            ),
          );
        } else {
          pdfs.push(file);
        }
      } else {
        others.push(
          Promise.resolve({
            name: file.name,
            error: "Unsupported file type — use PDF, DOC, DOCX, CSV, XLSX, or TXT",
          }),
        );
      }
    });

    Promise.all([
      pdfs.length ? handlePdfUpload(pdfs) : Promise.resolve<UploadOutcome[]>([]),
      Promise.all(others),
    ]).then(([pdfOutcomes, otherOutcomes]) =>
      reportUpload([...pdfOutcomes, ...otherOutcomes]),
    );

    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deletePdf = (file: SourceFile) => {
    if (!file.collectionId) {
      setPdfFiles((prev) => prev.filter((f) => f.id !== file.id));
      return;
    }
    PdfCollectionApi.delete<DeleteResponse>(file.collectionId)
      .then(() => {
        setPdfFiles((prev) => prev.filter((f) => f.id !== file.id));
        toast({
          title: "File deleted",
          description: "It's been removed from your sources.",
          variant: "success",
        });
      })
      .catch(() =>
        toast({ title: "Delete failed", variant: "destructive" }),
      );
  };

  const togglePdfActive = (file: SourceFile) => {
    if (!file.collectionId) return;
    const nextActive = !(file.active !== false);
    PdfCollectionApi.activate<{ status: string }>({
      collection_id: file.collectionId,
      active: nextActive,
    })
      .then(() => {
        setPdfFiles((prev) => {
          const next = prev.map((f) =>
            f.id === file.id ? { ...f, active: nextActive } : f,
          );
          onPdfCollectionsChange?.(
            next.filter((f) => f.collectionId && f.active !== false).map((f) => f.collectionId!),
          );
          return next;
        });
      })
      .catch(() => toast({ title: "Failed to update active status", variant: "destructive" }));
  };

  const toggleChatActive = (file: SourceFile) => {
    if (!file.collectionId) return;
    const nextActive = !(file.active !== false);
    ChatCollectionApi.activate<{ status: string }>({
      collection_id: file.collectionId,
      active: nextActive,
    })
      .then(() => {
        setChatFiles((prev) => {
          const next = prev.map((f) =>
            f.id === file.id ? { ...f, active: nextActive } : f,
          );
          onChatCollectionsChange?.(
            next.filter((f) => f.collectionId && f.active !== false).map((f) => f.collectionId!),
          );
          return next;
        });
      })
      .catch(() => toast({ title: "Failed to update active status", variant: "destructive" }));
  };

  const deleteChat = (file: SourceFile) => {
    if (!file.collectionId) {
      setChatFiles((prev) => prev.filter((f) => f.id !== file.id));
      return;
    }
    ChatCollectionApi.delete<DeleteResponse>(file.collectionId)
      .then(() => {
        setChatFiles((prev) => prev.filter((f) => f.id !== file.id));
        toast({
          title: "File deleted",
          description: "It's been removed from your sources.",
          variant: "success",
        });
      })
      .catch(() =>
        toast({ title: "Delete failed", variant: "destructive" }),
      );
  };

  const previewChat = (file: SourceFile) => {
    if (!file.collectionId) {
      toast({
        title: "Preview unavailable",
        description: "Chat collection ID tidak ditemukan.",
        variant: "destructive",
      });
      return;
    }

    setChatPreviewOpen(true);
    setChatPreviewLoading(true);
    setChatPreviewError(null);
    setChatPreviewText("");
    setChatPreviewFileName(file.name);
    setChatPreviewTruncated(false);

    ChatCollectionApi.preview<ChatCollectionPreviewResponse>(file.collectionId)
      .then((data) => {
        setChatPreviewFileName(data.file_name || file.name);
        setChatPreviewText(data.content_preview || "");
        setChatPreviewTruncated(Boolean(data.truncated));
      })
      .catch(() => {
        setChatPreviewError("Gagal memuat preview chat file.");
      })
      .finally(() => {
        setChatPreviewLoading(false);
      });
  };

  const togglePdfRowExpansion = (id: string) => {
    setExpandedPdfRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Sorting ──────────────────────────────────────────────────────────────
  function sortFiles(files: SourceFile[], sort: SortState) {
    return [...files].sort((a, b) => {
      const mul = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return mul * a.name.localeCompare(b.name);
      return mul * (a.uploadedAt.valueOf() - b.uploadedAt.valueOf());
    });
  }

  // Files tab merges PDF + WhatsApp exports into one list/cap — they're both
  // "a file someone uploaded", unlike Public Link (a URL) or Database/Chat
  // connections (live credentials). PDF entries that are really a Google
  // Drive link-only row (no local file) are excluded here as before.
  const pdfEligible = pdfFiles.filter(
    (f) =>
      !Boolean(f.linkedItems?.length) &&
      !(f.meta?.toLowerCase().includes("live link") ?? false),
  );
  const combinedFileSources = sortFiles([...pdfEligible, ...chatFiles], filesSort);

  const filesAtMax =
    pdfFiles.filter((f) => f.status !== "error").length +
      chatFiles.filter((f) => f.status !== "error").length >=
    MAX_FILES_PER_SECTION;

  return {
    filesInputRef,
    chatFiles,
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
  };
}
