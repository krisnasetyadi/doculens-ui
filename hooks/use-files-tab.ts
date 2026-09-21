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
  ChatCollectionMessagesResponse,
  ChatMessageRow,
  ChatUploadResponse,
  DeleteResponse,
  PdfCollectionTextContentResponse,
  PlainTextLineRow,
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
  const [chatPreviewFileName, setChatPreviewFileName] = useState("");
  const [chatPreviewSubtype, setChatPreviewSubtype] = useState<"whatsapp" | "plain_text">("plain_text");
  const [chatPreviewLines, setChatPreviewLines] = useState<PlainTextLineRow[]>([]);
  const [chatPreviewMessages, setChatPreviewMessages] = useState<ChatMessageRow[]>([]);
  const [chatPreviewTotal, setChatPreviewTotal] = useState(0);
  const [chatPreviewHasMore, setChatPreviewHasMore] = useState(false);
  const [chatPreviewLoadingMore, setChatPreviewLoadingMore] = useState(false);
  const chatPreviewCollectionIdRef = useRef<string | null>(null);
  const CHAT_PREVIEW_PAGE_SIZE = 50;

  const [textPreviewOpen, setTextPreviewOpen] = useState(false);
  const [textPreviewLoading, setTextPreviewLoading] = useState(false);
  const [textPreviewError, setTextPreviewError] = useState<string | null>(null);
  const [textPreviewFileName, setTextPreviewFileName] = useState("");
  const [textPreviewLines, setTextPreviewLines] = useState<PlainTextLineRow[]>([]);
  const [textPreviewTotalLines, setTextPreviewTotalLines] = useState(0);
  const [textPreviewHasMore, setTextPreviewHasMore] = useState(false);
  const [textPreviewLoadingMore, setTextPreviewLoadingMore] = useState(false);
  const textPreviewCollectionIdRef = useRef<string | null>(null);
  const textPreviewRawFileNameRef = useRef<string>("");
  const TEXT_PREVIEW_PAGE_SIZE = 50;

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
            folderId: col.folder_id,
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
          folderId: f.folderId,
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
            folderId: col.folder_id,
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
        folderId: file.folderId,
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
          rawFileName: file.name,
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

  // ── Folders (MS-274) ────────────────────────────────────────────────────
  const movePdfToFolder = (file: SourceFile, folderId: string | null) => {
    if (!file.collectionId) return;
    PdfCollectionApi.moveToFolder<{ status: string }>({
      collection_id: file.collectionId,
      folder_id: folderId,
    })
      .then(() => {
        setPdfFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, folderId: folderId ?? undefined } : f,
          ),
        );
      })
      .catch(() => toast({ title: "Failed to move file", variant: "destructive" }));
  };

  const moveChatToFolder = (file: SourceFile, folderId: string | null) => {
    if (!file.collectionId) return;
    ChatCollectionApi.moveToFolder<{ status: string }>({
      collection_id: file.collectionId,
      folder_id: folderId,
    })
      .then(() => {
        setChatFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, folderId: folderId ?? undefined } : f,
          ),
        );
      })
      .catch(() => toast({ title: "Failed to move file", variant: "destructive" }));
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
        description: "This chat source is unavailable.",
        variant: "destructive",
      });
      return;
    }

    const collectionId = file.collectionId;
    chatPreviewCollectionIdRef.current = collectionId;

    setChatPreviewOpen(true);
    setChatPreviewLoading(true);
    setChatPreviewError(null);
    setChatPreviewFileName(file.name);
    setChatPreviewMessages([]);
    setChatPreviewLines([]);
    setChatPreviewSubtype("plain_text");
    setChatPreviewTotal(0);
    setChatPreviewHasMore(false);

    ChatCollectionApi.messages<ChatCollectionMessagesResponse>(
      collectionId,
      0,
      CHAT_PREVIEW_PAGE_SIZE,
    )
      .then((data) => {
        if (chatPreviewCollectionIdRef.current !== collectionId) return;
        setChatPreviewFileName(data.file_name || file.name);
        setChatPreviewSubtype(data.subtype);
        setChatPreviewLines(data.lines || []);
        setChatPreviewMessages(data.messages || []);
        setChatPreviewTotal(data.total || 0);
        setChatPreviewHasMore(Boolean(data.has_more));
      })
      .catch(() => {
        if (chatPreviewCollectionIdRef.current !== collectionId) return;
        setChatPreviewError("Could not load the source preview.");
      })
      .finally(() => {
        if (chatPreviewCollectionIdRef.current !== collectionId) return;
        setChatPreviewLoading(false);
      });
  };

  const loadMoreChatPreview = () => {
    const collectionId = chatPreviewCollectionIdRef.current;
    if (!collectionId || chatPreviewLoadingMore || !chatPreviewHasMore) return;

    setChatPreviewLoadingMore(true);
    ChatCollectionApi.messages<ChatCollectionMessagesResponse>(
      collectionId,
      chatPreviewSubtype === "whatsapp" ? chatPreviewMessages.length : chatPreviewLines.length,
      CHAT_PREVIEW_PAGE_SIZE,
    )
      .then((data) => {
        if (chatPreviewCollectionIdRef.current !== collectionId) return;
        setChatPreviewMessages((prev) => [...prev, ...(data.messages || [])]);
        setChatPreviewLines((prev) => [...prev, ...(data.lines || [])]);
        setChatPreviewTotal(data.total || 0);
        setChatPreviewHasMore(Boolean(data.has_more));
      })
      .catch(() => {
        if (chatPreviewCollectionIdRef.current !== collectionId) return;
        toast({
          title: "Could not load more content",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (chatPreviewCollectionIdRef.current !== collectionId) return;
        setChatPreviewLoadingMore(false);
      });
  };

  const previewText = (file: SourceFile) => {
    if (!file.collectionId || !file.rawFileName) {
      toast({
        title: "Preview unavailable",
        description: "This file is unavailable.",
        variant: "destructive",
      });
      return;
    }

    const collectionId = file.collectionId;
    const rawFileName = file.rawFileName;
    textPreviewCollectionIdRef.current = collectionId;
    textPreviewRawFileNameRef.current = rawFileName;

    setTextPreviewOpen(true);
    setTextPreviewLoading(true);
    setTextPreviewError(null);
    setTextPreviewFileName(file.name);
    setTextPreviewLines([]);
    setTextPreviewTotalLines(0);
    setTextPreviewHasMore(false);

    PdfCollectionApi.textContent<PdfCollectionTextContentResponse>(
      collectionId,
      rawFileName,
      0,
      TEXT_PREVIEW_PAGE_SIZE,
    )
      .then((data) => {
        if (textPreviewCollectionIdRef.current !== collectionId) return;
        setTextPreviewFileName(data.file_name || file.name);
        setTextPreviewLines(data.lines || []);
        setTextPreviewTotalLines(data.total_lines || 0);
        setTextPreviewHasMore(Boolean(data.has_more));
      })
      .catch(() => {
        if (textPreviewCollectionIdRef.current !== collectionId) return;
        setTextPreviewError("Could not load the text preview.");
      })
      .finally(() => {
        if (textPreviewCollectionIdRef.current !== collectionId) return;
        setTextPreviewLoading(false);
      });
  };

  const loadMoreTextPreview = () => {
    const collectionId = textPreviewCollectionIdRef.current;
    const rawFileName = textPreviewRawFileNameRef.current;
    if (!collectionId || !rawFileName || textPreviewLoadingMore || !textPreviewHasMore) return;

    setTextPreviewLoadingMore(true);
    PdfCollectionApi.textContent<PdfCollectionTextContentResponse>(
      collectionId,
      rawFileName,
      textPreviewLines.length,
      TEXT_PREVIEW_PAGE_SIZE,
    )
      .then((data) => {
        if (textPreviewCollectionIdRef.current !== collectionId) return;
        setTextPreviewLines((prev) => [...prev, ...(data.lines || [])]);
        setTextPreviewTotalLines(data.total_lines || 0);
        setTextPreviewHasMore(Boolean(data.has_more));
      })
      .catch(() => {
        if (textPreviewCollectionIdRef.current !== collectionId) return;
        toast({
          title: "Could not load more lines",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (textPreviewCollectionIdRef.current !== collectionId) return;
        setTextPreviewLoadingMore(false);
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
    chatPreviewMessages,
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
  };
}
