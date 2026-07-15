"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Database,
  MessageSquare,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  AlertCircle,
  ArrowUpDown,
  ExternalLink,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  PdfCollectionsApi,
  PdfUploadApi,
  PdfCollectionApi,
  PublicLinksApi,
  PublicLinkApi,
  PublicLinkActivateApi,
  ChatCollectionsApi,
  ChatUploadApi,
  ChatCollectionApi,
  ChatCollectionPreviewApi,
} from "@/services";
import type {
  PdfCollection,
  UploadResponse,
  ChatCollection,
  ChatCollectionPreviewResponse,
  ChatUploadResponse,
  DeleteResponse,
  PublicLinkSource,
  PublicLinksResponse,
} from "@/services";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MAX_FILES_PER_SECTION = 20;
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 2 MB

type UploadStatus = "uploading" | "success" | "error";
type SortKey = "name" | "date";
type SortDir = "asc" | "desc";
type Tab = "pdf" | "link" | "chat" | "database";

interface SourceFile {
  id: string;
  name: string;
  uploadedAt: dayjs.Dayjs;
  status: UploadStatus;
  collectionId?: string;
  meta?: string; // e.g. doc count, message count
  rawFileName?: string;
  title?: string;
  linkedItems?: Array<{
    name: string;
    url: string;
    itemType: "file" | "folder";
  }>;
}

interface DbColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primary_key?: boolean;
}

interface DbTable {
  name: string;
  row_count?: number;
  columns?: DbColumn[];
}

type ConnectMode = "url" | "manual";

interface DbConnection {
  id: string;
  label: string;        // display name (host or url prefix)
  url: string;          // the full postgres URL
  connectedAt: dayjs.Dayjs;
  tables: DbTable[];
  loadingTables: boolean;
  expanded: boolean;    // show/hide table list
  error?: string;
}

interface SourcesPanelProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
  onPublicLinkIdsChange?: (ids: string[]) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function SortButton({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 text-xs font-semibold font-['Manrope'] px-2 py-1 rounded-md transition-colors",
        active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

function StatusIcon({ status }: { status: UploadStatus }) {
  if (status === "uploading")
    return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
}

function EmptyState({
  icon,
  label,
  onUpload,
  uploadLabel = "Upload File",
  secondaryAction,
  isDb,
  onDbConnect,
}: {
  icon: React.ReactNode;
  label: string;
  onUpload?: () => void;
  uploadLabel?: string;
  secondaryAction?: React.ReactNode;
  isDb?: boolean;
  onDbConnect?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
      <div className="mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">{icon}</div>
      <p className="font-['Manrope'] font-bold text-foreground text-base mb-1">
        No data yet
      </p>
      <p className="text-sm font-['Inter'] text-muted-foreground mb-6">{label}</p>
      {isDb ? null : (
        <div className="flex items-center gap-3">
          <Button
            onClick={onUpload}
            variant="outline"
            className="font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            <Upload className="h-4 w-4" />
            {uploadLabel}
          </Button>
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function SourcesPanel({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  onPdfCollectionsChange,
  onChatCollectionsChange,
  onPublicLinkIdsChange,
}: SourcesPanelProps) {
  const { toast } = useToast();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const {
    cachedPdfFiles,
    cachedChatFiles,
    setCachedPdfFiles,
    setCachedChatFiles,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<Tab>("pdf");
  const [pdfFiles, setPdfFiles] = useState<SourceFile[]>(
    () => cachedPdfFiles.map((f) => ({ ...f, uploadedAt: dayjs(f.uploadedAt) })),
  );
  const [chatFiles, setChatFiles] = useState<SourceFile[]>(
    () => cachedChatFiles.map((f) => ({ ...f, uploadedAt: dayjs(f.uploadedAt) })),
  );
  const [dbConnections, setDbConnections] = useState<DbConnection[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false);
  const [publicLinks, setPublicLinks] = useState<PublicLinkSource[]>([]);
  const [activePublicLinkIds, setActivePublicLinkIds] = useState<Set<string>>(new Set());
  const [expandedPublicLinks, setExpandedPublicLinks] = useState<string[]>([]);

  // Sort state per tab
  const [pdfSort, setPdfSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });
  const [chatSort, setChatSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });

  // DB connect dialog
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [pdfLinkDialogOpen, setPdfLinkDialogOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<ConnectMode>("url");
  const [pdfSourceUrl, setPdfSourceUrl] = useState("");
  const [pdfSourceTitle, setPdfSourceTitle] = useState("");
  const [pdfLinkError, setPdfLinkError] = useState<string | null>(null);
  const [savingPublicLink, setSavingPublicLink] = useState(false);
  const [expandedPdfRows, setExpandedPdfRows] = useState<Set<string>>(new Set());
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);
  const [chatPreviewLoading, setChatPreviewLoading] = useState(false);
  const [chatPreviewError, setChatPreviewError] = useState<string | null>(null);
  const [chatPreviewText, setChatPreviewText] = useState("");
  const [chatPreviewFileName, setChatPreviewFileName] = useState("");
  const [chatPreviewTruncated, setChatPreviewTruncated] = useState(false);
  const [dbUrl, setDbUrl] = useState("");
  const [dbManual, setDbManual] = useState({ host: "", port: "5432", username: "", password: "", dbname: "" });
  const [connectingDb, setConnectingDb] = useState(false);
  const [dbFormError, setDbFormError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const toggleTable = (name: string) =>
    setExpandedTables((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  // ── Load existing collections from API ──────────────────────────────────
  const fetchPdf = () => {
    setLoadingPdf(true);
    PdfCollectionsApi.get<PdfCollection[]>()
      .then((data) => {
        const apiFiles: SourceFile[] = data.map((col) => {
          const rawName = col.file_names?.[0] ?? "";
          return {
            id: col.collection_id,
            name:
              col.title?.trim() ||
              (rawName
                ?.replace(/\.pdf$/i, "")
                .replace(/[_-]/g, " ") ?? "Untitled"),
            uploadedAt: dayjs(col.created_at),
            status: "success",
            collectionId: col.collection_id,
            meta: `${col.document_count} doc${col.document_count !== 1 ? "s" : ""}`,
            rawFileName: rawName,
            title: col.title,
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
        })));
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
    ChatCollectionsApi.get<
      { collections: ChatCollection[]; count: number } | ChatCollection[]
    >()
      .then((raw) => {
        const data: ChatCollection[] = Array.isArray(raw)
          ? raw
          : (raw as any).collections ?? [];
        const files: SourceFile[] = data.map((col: any) => ({
          id: col.collection_id,
          name: col.filename ?? col.file_name ?? "Untitled",
          uploadedAt: col.created_at ? dayjs(col.created_at) : dayjs(),
          status: "success",
          collectionId: col.collection_id,
          meta: `${col.message_count ?? 0} messages · ${col.platform ?? ""}`,
        }));
        setChatFiles(files);
        setCachedChatFiles(files.map((f) => ({ ...f, uploadedAt: f.uploadedAt.toISOString() })));
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

  const fetchPublicLinks = () => {
    setLoadingPublicLinks(true);
    PublicLinksApi.get<PublicLinksResponse | PublicLinkSource[]>()
      .then((raw) => {
        const links = Array.isArray(raw) ? raw : raw.links ?? [];
        setPublicLinks(links);
        const activeIds = links
          .filter((link) => link.status === "active")
          .map((link) => link.link_id);
        setActivePublicLinkIds(new Set(activeIds));
        onPublicLinkIdsChange?.(activeIds);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load public links",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingPublicLinks(false));
  };

  const handleDbConnect = async () => {
    setDbFormError(null);
    let finalUrl = "";
    if (connectMode === "url") {
      if (!dbUrl.trim()) { setDbFormError("Please enter a connection URL"); return; }
      finalUrl = dbUrl.trim();
    } else {
      if (!dbManual.host.trim() || !dbManual.username.trim()) {
        setDbFormError("Host and username are required");
        return;
      }
      const pass = dbManual.password ? `:${encodeURIComponent(dbManual.password)}` : "";
      finalUrl = `postgresql://${encodeURIComponent(dbManual.username)}${pass}@${dbManual.host.trim()}:${dbManual.port || "5432"}/${dbManual.dbname.trim() || "postgres"}`;
    }

    // Derive a human-readable label
    let label = finalUrl;
    try {
      const u = new URL(finalUrl);
      label = `${u.hostname}${u.pathname}`;
    } catch {}

    const newConn: DbConnection = {
      id: `db-${Date.now()}`,
      label,
      url: finalUrl,
      connectedAt: dayjs(),
      tables: [],
      loadingTables: true,
      expanded: true,
    };

    setConnectingDb(true);
    // Test via server proxy
    try {
      const res = await fetch(`${API_BASE}/api/v1/database/tables`);
      if (!res.ok) throw new Error("Server returned " + res.status);
      const data = await res.json();
      const tables: DbTable[] = data.tables ?? [];
      newConn.tables = tables;
      newConn.loadingTables = false;
      setDbConnections((prev) => [newConn, ...prev]);
      setDbDialogOpen(false);
      setDbUrl("");
      setDbManual({ host: "", port: "5432", username: "", password: "", dbname: "" });
    } catch (e: any) {
      setDbFormError("Could not connect. Check your credentials and try again.");
    } finally {
      setConnectingDb(false);
    }
  };

  const handleConnectLinkOnly = async () => {
    const trimmedUrl = pdfSourceUrl.trim();
    if (!trimmedUrl) {
      setPdfLinkError("Please paste a link first");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setPdfLinkError("Please enter a valid URL");
      return;
    }

    setSavingPublicLink(true);
    setPdfLinkError(null);

    try {
      await PublicLinksApi.store<{ link: PublicLinkSource } | PublicLinkSource>({
        title: pdfSourceTitle.trim() || undefined,
        url: trimmedUrl,
      });

      await fetchPublicLinks();

      setPdfLinkDialogOpen(false);
      setPdfSourceUrl("");
      setPdfSourceTitle("");

      toast({
        title: "Link source saved",
        description: "Public link saved to database.",
      });
    } catch {
      setPdfLinkError("Could not save this link source. Please try again.");
    } finally {
      setSavingPublicLink(false);
    }
  };

  const deletePublicLink = async (linkId: string) => {
    try {
      await PublicLinkApi.delete<DeleteResponse>(linkId);
      await fetchPublicLinks();
      toast({ title: "Link deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const togglePublicLinkActive = async (linkId: string, active: boolean) => {
    PublicLinkActivateApi.store<{ status: string }>({ link_id: linkId, active })
      .then(() => {
        setActivePublicLinkIds((prev) => {
          const next = new Set(prev);
          if (active) {
            next.add(linkId);
          } else {
            next.delete(linkId);
          }
          onPublicLinkIdsChange?.(Array.from(next));
          return next;
        });
        setPublicLinks((prev) =>
          prev.map((link) =>
            link.link_id === linkId
              ? { ...link, status: active ? "active" : "inactive" }
              : link,
          ),
        );
      })
      .catch(() => {
        toast({ title: "Failed to update active status", variant: "destructive" });
      });
  };

  const togglePublicLinkExpansion = (linkId: string) => {
    setExpandedPublicLinks((prev) =>
      prev.includes(linkId)
        ? prev.filter((id) => id !== linkId)
        : [...prev, linkId],
    );
  };

  const sortPublicLinks = (
    links: PublicLinkSource[],
    sort: { key: SortKey; dir: SortDir },
  ) => {
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...links].sort((a, b) => {
      if (sort.key === "name") {
        return direction * a.title.localeCompare(b.title);
      }
      return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
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

  const fetchTablesForConnection = async (id: string) => {
    setDbConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, loadingTables: true, error: undefined } : c)),
    );
    try {
      const res = await fetch(`${API_BASE}/api/v1/database/tables`);
      const data = await res.json();
      const tables: DbTable[] = data.tables ?? [];
      setDbConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, tables, loadingTables: false } : c)),
      );
    } catch {
      setDbConnections((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, loadingTables: false, error: "Failed to load tables" } : c,
        ),
      );
    }
  };

  const toggleConnection = (id: string) =>
    setDbConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, expanded: !c.expanded } : c)),
    );

  const deleteConnection = (id: string) =>
    setDbConnections((prev) => prev.filter((c) => c.id !== id));

  useEffect(() => {
    fetchPdf();
    fetchChat();
    fetchPublicLinks();
  }, []);

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
    if (file.size > MAX_FILE_SIZE_BYTES) return "File is too large";
    if (existing.some((f) => f.name === file.name || f.name === file.name.replace(/\.\w+$/, "")))
      return "File name already exist";
    if (existing.filter((f) => f.status !== "error").length >= MAX_FILES_PER_SECTION)
      return `Maximum ${MAX_FILES_PER_SECTION} files per section`;
    return null;
  };

  // ── PDF upload ───────────────────────────────────────────────────────────
  const handlePdfUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const err = validateFile(file, ".pdf", pdfFiles);
      if (err) {
        toast({ title: err, variant: "destructive" });
        return;
      }
      const tempId = `uploading-${Date.now()}-${file.name}`;
      const placeholder: SourceFile = {
        id: tempId,
        name: file.name.replace(/\.pdf$/i, ""),
        uploadedAt: dayjs(),
        status: "uploading",
      };
      setPdfFiles((prev) => [placeholder, ...prev]);

      const formData = new FormData();
      formData.append("files", file);
      PdfUploadApi.store<UploadResponse>(formData, { persist_mode: "database" })
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
        })
        .catch(() => {
          setPdfFiles((prev) =>
            prev.map((f) =>
              f.id === tempId ? { ...f, status: "error" } : f,
            ),
          );
          toast({ title: "Upload failed", variant: "destructive" });
        });
    });
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  // ── Chat upload ──────────────────────────────────────────────────────────
  const handleChatUpload = (file: File) => {
    const err = validateFile(file, ".txt", chatFiles);
    if (err) {
      toast({ title: err, variant: "destructive" });
      return;
    }
    const tempId = `uploading-${Date.now()}-${file.name}`;
    const placeholder: SourceFile = {
      id: tempId,
      name: file.name,
      uploadedAt: dayjs(),
      status: "uploading",
    };
    setChatFiles((prev) => [placeholder, ...prev]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", "whatsapp");
    ChatUploadApi.store<ChatUploadResponse>(formData)
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
      })
      .catch(() => {
        setChatFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" } : f,
          ),
        );
        toast({ title: "Upload failed", variant: "destructive" });
      });
    if (chatInputRef.current) chatInputRef.current.value = "";
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deletePdf = (file: SourceFile) => {
    if (!file.collectionId) {
      setPdfFiles((prev) => prev.filter((f) => f.id !== file.id));
      return;
    }
    PdfCollectionApi.delete<DeleteResponse>(file.collectionId)
      .then(() => setPdfFiles((prev) => prev.filter((f) => f.id !== file.id)))
      .catch(() =>
        toast({ title: "Delete failed", variant: "destructive" }),
      );
  };

  const deleteChat = (file: SourceFile) => {
    if (!file.collectionId) {
      setChatFiles((prev) => prev.filter((f) => f.id !== file.id));
      return;
    }
    ChatCollectionApi.delete<DeleteResponse>(file.collectionId)
      .then(() => setChatFiles((prev) => prev.filter((f) => f.id !== file.id)))
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

    ChatCollectionPreviewApi.find<ChatCollectionPreviewResponse>(`${file.collectionId}/preview?max_chars=20000`)
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

  // ── Sorting ──────────────────────────────────────────────────────────────
  function sortFiles(files: SourceFile[], sort: { key: SortKey; dir: SortDir }) {
    return [...files].sort((a, b) => {
      const mul = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return mul * a.name.localeCompare(b.name);
      return mul * (a.uploadedAt.valueOf() - b.uploadedAt.valueOf());
    });
  }

  function toggleSort(
    current: { key: SortKey; dir: SortDir },
    key: SortKey,
    setter: React.Dispatch<React.SetStateAction<{ key: SortKey; dir: SortDir }>>,
  ) {
    setter(
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const sortedPdf = sortFiles(pdfFiles, pdfSort);
  const sortedChat = sortFiles(chatFiles, chatSort);
  const linkSources = sortPublicLinks(publicLinks, pdfSort);
  const pdfOnlySources = sortedPdf.filter(
    (f) =>
      !Boolean(f.linkedItems?.length) &&
      !(f.meta?.toLowerCase().includes("live link") ?? false),
  );

  const pdfAtMax =
    pdfFiles.filter((f) => f.status !== "error").length >= MAX_FILES_PER_SECTION;
  const chatAtMax =
    chatFiles.filter((f) => f.status !== "error").length >= MAX_FILES_PER_SECTION;

  // ── Tab config ───────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pdf", label: "PDF File", icon: <FileText className="h-4 w-4" /> },
    { id: "link", label: "Public Link", icon: <Link2 className="h-4 w-4" /> },
    { id: "chat", label: "Chat (.txt)", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "database", label: "Database", icon: <Database className="h-4 w-4" /> },
  ];

  // ── File list row ────────────────────────────────────────────────────────
  const FileRow = ({
    file,
    onDelete,
    isPdf = false,
    onPreview,
    onToggleExpand,
    expanded,
  }: {
    file: SourceFile;
    onDelete: () => void;
    isPdf?: boolean;
    onPreview?: () => void;
    onToggleExpand?: () => void;
    expanded?: boolean;
  }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card hover:bg-muted/30 group transition-colors border border-border/60">
      <StatusIcon status={file.status} />
      <div className="flex-1 min-w-0">
        {isPdf && file.status === "success" && file.rawFileName ? (
          <button
            onClick={() => {
              if (file.collectionId && file.rawFileName) {
                const url = `${API_BASE}/api/v1/files/${file.collectionId}/${encodeURIComponent(file.rawFileName)}`;
                window.open(url, "_blank");
              }
            }}
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={file.name}
          >
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
            <ExternalLink className="h-3 w-3 shrink-0 inline opacity-0 group-hover:opacity-70 transition-opacity text-primary" />
          </button>
        ) : isPdf && file.linkedItems?.length ? (
          <button
            onClick={onToggleExpand}
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
            className="w-full min-w-0 text-sm font-semibold font-['Manrope'] text-foreground hover:text-primary hover:underline transition-colors text-left flex items-center gap-1.5 focus:outline-none"
            title={`Preview ${file.name}`}
          >
            <span className="truncate flex-1 min-w-0" title={file.name}>{file.name}</span>
            <ExternalLink className="h-3 w-3 shrink-0 inline opacity-0 group-hover:opacity-70 transition-opacity text-primary" />
          </button>
        ) : (
          <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate" title={file.name}>
            {file.name}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground/60 font-['Inter']">
            {file.uploadedAt.format("DD MMM YYYY, HH:mm")}
          </span>
          {file.meta && file.status === "success" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {file.meta}
            </Badge>
          )}
          {file.linkedItems && file.linkedItems.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {file.linkedItems.length} linked
            </Badge>
          )}
          {file.status === "error" && (
            <span className="text-[11px] text-red-400 font-['Inter']">
              Upload failed
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const TableRow = ({ table }: { table: DbTable }) => {
    const expanded = expandedTables.has(table.name);
    return (
      <div className="rounded-xl bg-card border border-border/60 overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleTable(table.name)}
        >
          {table.columns?.length ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <p className="text-sm font-semibold font-['Manrope'] text-foreground flex-1 truncate font-mono">
            {table.name}
          </p>
          <div className="flex items-center gap-2">
            {table.row_count !== undefined && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {table.row_count} rows
              </Badge>
            )}
            {table.columns && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {table.columns.length} cols
              </Badge>
            )}
          </div>
        </div>
        {expanded && table.columns && table.columns.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2 pl-11 space-y-1.5 bg-muted/20">
            {table.columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-muted-foreground">{col.name}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{col.type}</Badge>
                {col.nullable === false && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">NOT NULL</Badge>
                )}
                {col.primary_key && (
                  <Badge className="text-[10px] px-1 py-0 bg-primary text-primary-foreground">PK</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const SortBar = ({
    sort,
    onToggle,
  }: {
    sort: { key: SortKey; dir: SortDir };
    onToggle: (key: SortKey) => void;
  }) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground/60 font-['Inter'] mr-1">Sort:</span>
      <SortButton
        label="Name"
        sortKey="name"
        active={sort.key === "name"}
        dir={sort.dir}
        onClick={() => onToggle("name")}
      />
      <SortButton
        label="Date"
        sortKey="date"
        active={sort.key === "date"}
        dir={sort.dir}
        onClick={() => onToggle("date")}
      />
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-8 pt-10 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-['Manrope'] text-3xl font-extrabold text-foreground tracking-tight mb-1">
            Sources
          </h2>
          <p className="font-['Inter'] text-muted-foreground text-sm">
            Manage all your knowledge sources
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-muted/60 border border-border/50 p-1 rounded-xl w-fit mb-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg font-['Manrope'] font-semibold text-sm transition-all",
                activeTab === t.id
                  ? "bg-card shadow-sm text-primary border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PDF tab ──────────────────────────────────────────────────── */}
        {activeTab === "pdf" && (
          <div>
            {loadingPdf ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
              </div>
            ) : pdfOnlySources.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-16 w-16" />}
                label="Upload a PDF file to get started"
                onUpload={() => pdfInputRef.current?.click()}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <SortBar
                    sort={pdfSort}
                    onToggle={(k) => toggleSort(pdfSort, k, setPdfSort)}
                  />
                  <div className="flex items-center gap-2">
                    {pdfAtMax && (
                      <span className="flex items-center gap-1 text-xs text-amber-500 font-[Inter]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Max {MAX_FILES_PER_SECTION} files reached
                      </span>
                    )}
                    <Button
                      size="sm"
                      disabled={pdfAtMax}
                      onClick={() => pdfInputRef.current?.click()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-semibold gap-1.5 h-8 text-xs shadow-[0_4px_14px_rgba(74,124,255,0.3)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Upload PDF
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {pdfOnlySources.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <FileRow
                        file={f}
                        onDelete={() => deletePdf(f)}
                        isPdf
                        expanded={expandedPdfRows.has(f.id)}
                        onToggleExpand={() => togglePdfRowExpansion(f.id)}
                      />
                      {expandedPdfRows.has(f.id) && f.linkedItems && f.linkedItems.length > 0 && (
                        <div className="ml-9 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 space-y-1">
                          {f.linkedItems.map((item, idx) => (
                            <a
                              key={`${f.id}-${idx}-${item.url}`}
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{item.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <input
              ref={pdfInputRef}
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={(e) => handlePdfUpload(e.target.files)}
            />
          </div>
        )}

        {/* ── Public Link tab ─────────────────────────────────────────── */}
        {activeTab === "link" && (
          <div>
            {loadingPublicLinks ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
              </div>
            ) : linkSources.length === 0 ? (
              <EmptyState
                icon={<Link2 className="h-16 w-16" />}
                label="Attach Google Drive / public links as sources"
                uploadLabel="Add Link"
                onUpload={() => {
                  setPdfLinkError(null);
                  setPdfLinkDialogOpen(true);
                }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <SortBar
                    sort={pdfSort}
                    onToggle={(k) => toggleSort(pdfSort, k, setPdfSort)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      setPdfLinkError(null);
                      setPdfLinkDialogOpen(true);
                    }}
                    variant="outline"
                    className="font-['Manrope'] font-semibold gap-1.5 h-8 text-xs border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Add Link
                  </Button>
                </div>
                <div className="space-y-2">
                  <Accordion type="multiple" value={expandedPublicLinks} className="space-y-2">
                    {linkSources.map((link) => {
                      const isActive = activePublicLinkIds.has(link.link_id);

                      return (
                        <AccordionItem
                          key={link.link_id}
                          value={link.link_id}
                          className="rounded-xl bg-card border border-border/60 px-4"
                        >
                          <AccordionTrigger
                            className="py-3 hover:no-underline"
                            onClick={() => togglePublicLinkExpansion(link.link_id)}
                          >
                            <div className="flex items-center gap-3 min-w-0 w-full">
                              <Link2 className="h-4 w-4 shrink-0 text-primary" />
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate" title={link.title}>
                                  {link.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground/60 font-['Inter'] truncate" title={link.url}>
                                  {link.url}
                                </p>
                              </div>
                              <Badge
                                variant={isActive ? "default" : "secondary"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {link.item_count} items
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-3">
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-muted-foreground font-['Inter']">
                                  Added {dayjs(link.created_at).format("DD MMM YYYY, HH:mm")}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant={isActive ? "secondary" : "default"}
                                    onClick={() => togglePublicLinkActive(link.link_id, !isActive)}
                                    className="h-7 text-[11px] font-['Manrope'] font-semibold"
                                  >
                                    {isActive ? "Set Inactive" : "Set Active"}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deletePublicLink(link.link_id)}
                                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {link.items.length === 0 ? (
                                <p className="text-xs text-muted-foreground/70 font-['Inter']">
                                  No extracted items yet.
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                                  {link.items.map((item) => (
                                    <a
                                      key={item.id}
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      {item.item_type === "folder" ? (
                                        <ChevronRight className="h-3 w-3" />
                                      ) : (
                                        <ExternalLink className="h-3 w-3" />
                                      )}
                                      <span className="truncate" title={item.name}>{item.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Chat tab ─────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div>
            {loadingChat ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
              </div>
            ) : chatFiles.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-16 w-16" />}
                label="Upload a .txt chat export to get started"
                onUpload={() => chatInputRef.current?.click()}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <SortBar
                    sort={chatSort}
                    onToggle={(k) => toggleSort(chatSort, k, setChatSort)}
                  />
                  <div className="flex items-center gap-2">
                    {chatAtMax && (
                      <span className="flex items-center gap-1 text-xs text-amber-500 font-[Inter]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Max {MAX_FILES_PER_SECTION} files reached
                      </span>
                    )}
                    <Button
                      size="sm"
                      disabled={chatAtMax}
                      onClick={() => chatInputRef.current?.click()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-semibold gap-1.5 h-8 text-xs shadow-[0_4px_14px_rgba(74,124,255,0.3)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Upload Chat
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {sortedChat.map((f) => (
                    <FileRow
                      key={f.id}
                      file={f}
                      onDelete={() => deleteChat(f)}
                      onPreview={f.status === "success" && !!f.collectionId ? () => previewChat(f) : undefined}
                    />
                  ))}
                </div>
              </>
            )}
            <input
              ref={chatInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleChatUpload(e.target.files[0])
              }
            />
          </div>
        )}

        {/* ── Database tab ─────────────────────────────────────────────── */}
        {activeTab === "database" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground font-['Inter']">
                {dbConnections.length > 0
                  ? `${dbConnections.length} connection${dbConnections.length !== 1 ? "s" : ""}`
                  : "Add a database connection to browse its tables"}
              </p>
              <Button
                size="sm"
                onClick={() => setDbDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-semibold gap-1.5 h-8 text-xs shadow-[0_4px_14px_rgba(74,124,255,0.3)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect Database
              </Button>
            </div>

            {dbConnections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
                <div className="mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">
                  <Database className="h-16 w-16" />
                </div>
                <p className="font-['Manrope'] font-bold text-foreground text-base mb-1">
                  No connections yet
                </p>
                <p className="text-sm font-['Inter'] text-muted-foreground text-center max-w-xs">
                  Paste a PostgreSQL URL or fill in manual credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dbConnections.map((conn) => (
                  <div key={conn.id} className="rounded-xl bg-card border border-border/60 overflow-hidden">
                    {/* Connection header */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                      onClick={() => toggleConnection(conn.id)}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate font-mono">
                          {conn.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                          Connected {conn.connectedAt.format("DD MMM YYYY, HH:mm")}
                          {conn.tables.length > 0 && ` · ${conn.tables.length} tables`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); fetchTablesForConnection(conn.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-primary font-['Manrope'] font-semibold px-2 py-1 rounded-md hover:bg-primary/10"
                        >
                          Refresh
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {conn.expanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Table list */}
                    {conn.expanded && (
                      <div className="border-t border-border/60 bg-muted/20">
                        {conn.loadingTables ? (
                          <div className="flex items-center gap-2 px-5 py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
                            <span className="text-xs text-muted-foreground/60 font-['Inter']">Loading tables…</span>
                          </div>
                        ) : conn.error ? (
                          <div className="flex items-center gap-2 px-5 py-4 text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-['Inter']">{conn.error}</span>
                          </div>
                        ) : conn.tables.length === 0 ? (
                          <p className="px-5 py-4 text-xs text-muted-foreground/60 font-['Inter']">No tables found.</p>
                        ) : (
                          <div className="divide-y divide-border/40">
                            {conn.tables.map((t) => (
                              <div key={t.name} className="px-5 py-2.5 flex items-center gap-3">
                                <Database className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                <span className="text-xs font-mono font-semibold text-foreground flex-1">{t.name}</span>
                                {t.row_count !== undefined && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {t.row_count} rows
                                  </Badge>
                                )}
                                {t.columns && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {t.columns.length} cols
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DB Connect Dialog ─────────────────────────────────────────── */}
      <Dialog open={dbDialogOpen} onOpenChange={setDbDialogOpen}>
        <DialogContent className="sm:max-w-md font-['Inter']">
          <DialogHeader>
            <DialogTitle className="font-['Manrope'] font-extrabold text-foreground">
              Connect Database
            </DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-muted/60 border border-border/50 p-1 rounded-lg w-fit mb-2">
            {(["url", "manual"] as ConnectMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setConnectMode(m); setDbFormError(null); }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-semibold font-['Manrope'] transition-all",
                  connectMode === m ? "bg-card shadow-sm text-primary border border-border/60" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "url" ? "Connection URL" : "Manual"}
              </button>
            ))}
          </div>

          <div className="space-y-3 py-1">
            {connectMode === "url" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">PostgreSQL URL</label>
                <Input
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground/60 font-['Inter']">Paste your full connection string</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Host</label>
                    <Input placeholder="localhost" value={dbManual.host}
                      onChange={(e) => setDbManual((p) => ({ ...p, host: e.target.value }))}
                      className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Port</label>
                    <Input placeholder="5432" value={dbManual.port}
                      onChange={(e) => setDbManual((p) => ({ ...p, port: e.target.value }))}
                      className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Database name</label>
                  <Input placeholder="postgres" value={dbManual.dbname}
                    onChange={(e) => setDbManual((p) => ({ ...p, dbname: e.target.value }))}
                    className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Username</label>
                  <Input placeholder="postgres" value={dbManual.username}
                    onChange={(e) => setDbManual((p) => ({ ...p, username: e.target.value }))}
                    className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Password</label>
                  <Input type="password" placeholder="••••••••" value={dbManual.password}
                    onChange={(e) => setDbManual((p) => ({ ...p, password: e.target.value }))}
                    className="h-9 text-sm" />
                </div>
              </>
            )}

            {dbFormError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {dbFormError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDbDialogOpen(false); setDbFormError(null); }}
              className="font-['Manrope'] font-semibold">
              Cancel
            </Button>
            <Button onClick={handleDbConnect} disabled={connectingDb}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-semibold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)]">
              {connectingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {connectingDb ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chatPreviewOpen} onOpenChange={setChatPreviewOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="truncate">Preview Chat: {chatPreviewFileName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-auto rounded-lg border border-border/60 bg-muted/20 p-4">
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

      <Dialog
        open={pdfLinkDialogOpen}
        onOpenChange={(open) => {
          setPdfLinkDialogOpen(open);
          if (!open) {
            setPdfLinkError(null);
            setPdfSourceUrl("");
            setPdfSourceTitle("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg font-['Inter']">
          <DialogHeader>
            <DialogTitle className="font-['Manrope'] font-extrabold text-foreground">
              Add Public Link Source
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Source title
              </label>
              <Input
                placeholder="Engineering Manuals"
                value={pdfSourceTitle}
                onChange={(e) => setPdfSourceTitle(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60 font-['Inter'] leading-5">
                Optional. This becomes the label shown in the sources list.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">
                Public URL
              </label>
              <Input
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={pdfSourceUrl}
                onChange={(e) => {
                  setPdfSourceUrl(e.target.value);
                  if (pdfLinkError) setPdfLinkError(null);
                }}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60 font-['Inter'] leading-5">
                Supports public Google Drive links and other publicly accessible URLs.
              </p>
            </div>

            {pdfLinkError && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pdfLinkError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPdfLinkDialogOpen(false);
                setPdfLinkError(null);
                setPdfSourceUrl("");
                setPdfSourceTitle("");
              }}
              className="font-['Manrope'] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleConnectLinkOnly}
              disabled={savingPublicLink}
              className="font-['Manrope'] font-semibold"
            >
              {savingPublicLink ? "Saving..." : "Save Link Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}