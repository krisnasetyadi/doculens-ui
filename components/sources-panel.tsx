"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Database,
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
  Eye,
  EyeOff,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAuthStore } from "@/stores/auth-store";
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
  DatabaseConnectionsApi,
  DatabaseConnectionApi,
  DatabaseConnectionActivateApi,
  PdfCollectionActivateApi,
  ChatCollectionActivateApi,
  TelegramConnectionsApi,
  TelegramConnectionApi,
  TelegramConnectionActivateApi,
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
  DatabaseConnectionSource,
  DatabaseConnectionsResponse,
  DbTableInfo,
  TelegramConnectionSource,
  TelegramConnectionsResponse,
  TelegramSyncResponse,
} from "@/services";
import { TelegramConnectDialog } from "@/components/telegram-connect-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MAX_FILES_PER_SECTION = 20;
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

/** Hide the `user:pass@` userinfo segment of a connection string so a saved
 * DB password isn't sitting in plaintext on screen after the connect dialog closes. */
function maskConnectionUrl(url: string): string {
  return url.replace(/:\/\/([^@/]+)@/, "://••••@");
}

type UploadStatus = "uploading" | "success" | "error";
type SortKey = "name" | "date";
type SortDir = "asc" | "desc";
type Tab = "files" | "link" | "chat" | "database";

/** How one picked file ended up. Files are uploaded in parallel but only a
 * single toast is on screen at a time, so outcomes are collected and the whole
 * batch is reported once instead of each file racing to toast over the others. */
interface UploadOutcome {
  name: string;
  /** Set when the file never made it in — failed validation or a failed request. */
  error?: string;
}

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
  /** Whether this collection is used as a knowledge source (distinct from upload `status`). */
  active?: boolean;
  /** Which upload type this came from — the Files tab merges PDF + WhatsApp
   * exports into one list/cap, so rows need a way to tell them apart. */
  kind?: "pdf" | "chat";
}

interface SourcesPanelProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  onPdfCollectionsChange?: (ids: string[]) => void;
  onChatCollectionsChange?: (ids: string[]) => void;
  onPublicLinkIdsChange?: (ids: string[]) => void;
  onDbConnectionIdsChange?: (ids: string[]) => void;
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
        "flex items-center gap-1 text-xs font-bold font-['Manrope'] px-2 py-1 rounded-xl transition-colors",
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

export function EmptyState({
  icon,
  heading = "No data yet",
  label,
  onUpload,
  uploadLabel = "Upload File",
  uploadIcon,
  secondaryAction,
  ctaVariant = "outline",
}: {
  icon: React.ReactNode;
  heading?: string;
  label: string;
  onUpload?: () => void;
  uploadLabel?: string;
  uploadIcon?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** "outline" (default) for panels where this isn't the page's one CTA;
   * "primary" for a standalone empty page (e.g. History) where it is. */
  ctaVariant?: "outline" | "primary";
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
      <div className="mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">{icon}</div>
      <p className="font-['Manrope'] font-bold text-foreground text-base mb-1">
        {heading}
      </p>
      <p className="text-sm font-['Inter'] text-muted-foreground mb-6">{label}</p>
      <div className="flex items-center gap-3">
        <Button
          onClick={onUpload}
          variant={ctaVariant === "primary" ? "default" : "outline"}
          className={
            ctaVariant === "primary"
              ? "rounded-xl font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
              : "rounded-xl font-['Manrope'] font-semibold gap-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          }
        >
          {uploadIcon ?? <Upload className="h-4 w-4" />}
          {uploadLabel}
        </Button>
        {secondaryAction}
      </div>
    </div>
  );
}

export function SourcesPanel({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  onPdfCollectionsChange,
  onChatCollectionsChange,
  onPublicLinkIdsChange,
  onDbConnectionIdsChange,
}: SourcesPanelProps) {
  const { toast } = useToast();
  const filesInputRef = useRef<HTMLInputElement>(null);

  const {
    cachedPdfFiles,
    cachedChatFiles,
    setCachedPdfFiles,
    setCachedChatFiles,
  } = useWorkspaceStore();

  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>("files");
  const [pdfFiles, setPdfFiles] = useState<SourceFile[]>(
    () => cachedPdfFiles.map((f) => ({ ...f, uploadedAt: dayjs(f.uploadedAt) })),
  );
  const [chatFiles, setChatFiles] = useState<SourceFile[]>(
    () => cachedChatFiles.map((f) => ({ ...f, uploadedAt: dayjs(f.uploadedAt) })),
  );
  const [dbConnections, setDbConnections] = useState<DatabaseConnectionSource[]>([]);
  const [loadingDbConnections, setLoadingDbConnections] = useState(false);
  const [telegramConnections, setTelegramConnections] = useState<TelegramConnectionSource[]>([]);
  const [loadingTelegramConnections, setLoadingTelegramConnections] = useState(false);
  const [expandedTelegramConnections, setExpandedTelegramConnections] = useState<Set<string>>(new Set());
  const [syncingTelegramChats, setSyncingTelegramChats] = useState<Set<string>>(new Set());
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramDialogConnection, setTelegramDialogConnection] = useState<TelegramConnectionSource | null>(null);
  const [expandedDbConnections, setExpandedDbConnections] = useState<Set<string>>(new Set());
  const [loadingTablesFor, setLoadingTablesFor] = useState<Set<string>>(new Set());
  const [dbTableErrors, setDbTableErrors] = useState<Record<string, string>>({});
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false);
  const [publicLinks, setPublicLinks] = useState<PublicLinkSource[]>([]);
  const [activePublicLinkIds, setActivePublicLinkIds] = useState<Set<string>>(new Set());
  const [expandedPublicLinks, setExpandedPublicLinks] = useState<string[]>([]);

  // Sort state per tab
  const [filesSort, setFilesSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });
  const [linkSort, setLinkSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });
  const [dbSort, setDbSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });

  // DB connect dialog
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [pdfLinkDialogOpen, setPdfLinkDialogOpen] = useState(false);
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
  const [dbUrlVisible, setDbUrlVisible] = useState(false);
  const [dbLabel, setDbLabel] = useState("");
  const [connectingDb, setConnectingDb] = useState(false);
  const [dbFormError, setDbFormError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [revealedConnUrls, setRevealedConnUrls] = useState<Set<string>>(new Set());
  const toggleConnUrlReveal = (id: string) =>
    setRevealedConnUrls((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    ChatCollectionsApi.get<
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

  const fetchDatabaseConnections = () => {
    setLoadingDbConnections(true);
    DatabaseConnectionsApi.get<DatabaseConnectionsResponse | DatabaseConnectionSource[]>()
      .then((raw) => {
        const connections = Array.isArray(raw) ? raw : raw.connections ?? [];
        setDbConnections(connections);
        const activeIds = connections
          .filter((c) => c.status === "active")
          .map((c) => c.connection_id);
        onDbConnectionIdsChange?.(activeIds);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load database connections",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingDbConnections(false));
  };

  const handleDbConnect = async () => {
    setDbFormError(null);
    const trimmedUrl = dbUrl.trim();
    if (!trimmedUrl) {
      setDbFormError("Please enter a connection URL");
      return;
    }

    setConnectingDb(true);
    try {
      const created = await DatabaseConnectionsApi.store<DatabaseConnectionSource>({
        label: dbLabel.trim() || undefined,
        url: trimmedUrl,
      });
      setDbConnections((prev) => {
        const next = [created, ...prev];
        onDbConnectionIdsChange?.(
          next.filter((c) => c.status === "active").map((c) => c.connection_id),
        );
        return next;
      });
      setExpandedDbConnections((prev) => new Set(prev).add(created.connection_id));
      setDbDialogOpen(false);
      setDbUrl("");
      setDbLabel("");
      setDbUrlVisible(false);
      toast({ title: "Database connected", description: `${created.table_count} table(s) found.` });
    } catch (e: any) {
      setDbFormError("Could not connect. Check the URL and try again.");
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

  const refreshConnectionTables = async (id: string) => {
    setLoadingTablesFor((prev) => new Set(prev).add(id));
    setDbTableErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const updated = await DatabaseConnectionApi.find<DatabaseConnectionSource>(`${id}/tables`);
      setDbConnections((prev) => prev.map((c) => (c.connection_id === id ? updated : c)));
    } catch {
      setDbTableErrors((prev) => ({ ...prev, [id]: "Failed to load tables" }));
    } finally {
      setLoadingTablesFor((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleDbConnectionExpansion = (id: string) => {
    setExpandedDbConnections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Lazily fetch tables the first time a connection is expanded.
        refreshConnectionTables(id);
      }
      return next;
    });
  };

  const toggleDbConnectionActive = (id: string, active: boolean) => {
    DatabaseConnectionActivateApi.store<{ status: string }>({ connection_id: id, active })
      .then(() => {
        setDbConnections((prev) => {
          const next = prev.map((c) =>
            c.connection_id === id ? { ...c, status: active ? "active" as const : "inactive" as const } : c,
          );
          onDbConnectionIdsChange?.(
            next.filter((c) => c.status === "active").map((c) => c.connection_id),
          );
          return next;
        });
      })
      .catch(() => {
        toast({ title: "Failed to update active status", variant: "destructive" });
      });
  };

  const deleteDbConnection = (id: string) => {
    DatabaseConnectionApi.delete<DeleteResponse>(id)
      .then(() => {
        setDbConnections((prev) => {
          const next = prev.filter((c) => c.connection_id !== id);
          onDbConnectionIdsChange?.(
            next.filter((c) => c.status === "active").map((c) => c.connection_id),
          );
          return next;
        });
        toast({ title: "Connection deleted" });
      })
      .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
  };

  // ── Telegram (live chat connection) ───────────────────────────────────────
  const fetchTelegramConnections = () => {
    setLoadingTelegramConnections(true);
    TelegramConnectionsApi.get<TelegramConnectionsResponse>()
      .then((data) => setTelegramConnections(data.connections))
      .catch(() =>
        toast({
          title: "Error",
          description: "Failed to load Telegram connections",
          variant: "destructive",
        }),
      )
      .finally(() => setLoadingTelegramConnections(false));
  };

  const toggleTelegramConnectionExpansion = (id: string) => {
    setExpandedTelegramConnections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTelegramConnectionActive = (id: string, active: boolean) => {
    TelegramConnectionActivateApi.store<{ status: string }>({ connection_id: id, active })
      .then(() => {
        setTelegramConnections((prev) =>
          prev.map((c) => (c.connection_id === id ? { ...c, status: active ? "active" : "inactive" } : c)),
        );
      })
      .catch(() => toast({ title: "Failed to update active status", variant: "destructive" }));
  };

  const deleteTelegramConnection = (id: string) => {
    TelegramConnectionApi.delete<DeleteResponse>(id)
      .then(() => {
        setTelegramConnections((prev) => prev.filter((c) => c.connection_id !== id));
        toast({ title: "Telegram connection removed", description: "Already-synced chats stay searchable." });
      })
      .catch(() => toast({ title: "Delete failed", variant: "destructive" }));
  };

  /** Re-sync a single already-selected chat (or a fresh batch from the
   * connect dialog) — safe to hit repeatedly, it just pulls the latest
   * messages into the same chat_collection rather than duplicating it. */
  const syncTelegramChats = (connectionId: string, dialogIds: string[]) => {
    const keys = dialogIds.map((d) => `${connectionId}:${d}`);
    setSyncingTelegramChats((prev) => new Set([...prev, ...keys]));
    TelegramConnectionApi.storeAt<TelegramSyncResponse>(`${connectionId}/sync`, {
      dialog_ids: dialogIds,
      message_limit: 2000,
    })
      .then((data) => {
        const failed = data.results.filter((r) => r.status === "error");
        if (failed.length > 0) {
          toast({
            title: "Some chats didn't sync",
            description: failed.map((f) => f.title).join(", "),
            variant: "destructive",
          });
        } else {
          toast({ title: "Synced", description: `${data.results.length} chat(s) up to date.` });
        }
        fetchTelegramConnections();
      })
      .catch((err) =>
        toast({
          title: "Sync failed",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        setSyncingTelegramChats((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
      });
  };

  useEffect(() => {
    fetchPdf();
    fetchPublicLinks();
    // Chat/Database are admin-only tabs — fetching them for everyone else
    // just trips the backend's role check and surfaces confusing error toasts.
    if (isAdmin) {
      fetchChat();
      fetchDatabaseConnections();
      fetchTelegramConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Active chat sources for the query context come from two places now:
  // WhatsApp uploads (chatFiles) and Telegram-synced chats (telegramConnections).
  useEffect(() => {
    const whatsappActive = chatFiles
      .filter((f) => f.collectionId && f.active !== false)
      .map((f) => f.collectionId!);
    const telegramActive = telegramConnections
      .filter((c) => c.status === "active")
      .flatMap((c) => c.selected_chats)
      .filter((sc) => sc.chat_collection_id && sc.status === "active")
      .map((sc) => sc.chat_collection_id!);
    onChatCollectionsChange?.([...whatsappActive, ...telegramActive]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatFiles, telegramConnections]);

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

  // ── PDF upload ───────────────────────────────────────────────────────────
  const handlePdfUpload = (files: File[]): Promise<UploadOutcome[]> =>
    Promise.all(
      files.map((file): Promise<UploadOutcome> => {
        const err = validateFile(file, ".pdf", [...pdfFiles, ...chatFiles]);
        if (err) return Promise.resolve({ name: file.name, error: err });

        const tempId = `uploading-${Date.now()}-${file.name}`;
        const placeholder: SourceFile = {
          id: tempId,
          name: file.name.replace(/\.pdf$/i, ""),
          uploadedAt: dayjs(),
          status: "uploading",
          kind: "pdf",
        };
        setPdfFiles((prev) => [placeholder, ...prev]);

        const formData = new FormData();
        formData.append("files", file);
        return PdfUploadApi.store<UploadResponse>(formData, { persist_mode: "database" })
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
    return ChatUploadApi.store<ChatUploadResponse>(formData)
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
      .catch(() => {
        setChatFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" } : f,
          ),
        );
        return { name: file.name, error: "Upload failed" };
      });
  };

  // ── Merged Files-tab upload (PDF for everyone; WhatsApp .txt is admin-only,
  // same as the backend's /chat/upload — matches the old separate Chat tab) ──
  const handleFilesUpload = (files: FileList | null) => {
    if (!files) return;
    const pdfs: File[] = [];
    const others: Promise<UploadOutcome>[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf") pdfs.push(file);
      else if (ext === "txt") {
        others.push(
          isAdmin
            ? handleChatUpload(file)
            : Promise.resolve({ name: file.name, error: "Chat exports are admin-only" }),
        );
      } else {
        others.push(
          Promise.resolve({
            name: file.name,
            error: `Not a .pdf${isAdmin ? " or .txt" : ""} file`,
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
      .then(() => setPdfFiles((prev) => prev.filter((f) => f.id !== file.id)))
      .catch(() =>
        toast({ title: "Delete failed", variant: "destructive" }),
      );
  };

  const togglePdfActive = (file: SourceFile) => {
    if (!file.collectionId) return;
    const nextActive = !(file.active !== false);
    PdfCollectionActivateApi.store<{ status: string }>({
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
    ChatCollectionActivateApi.store<{ status: string }>({
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

  const linkSources = sortPublicLinks(publicLinks, linkSort);
  const sortedDbConnections = [...dbConnections].sort((a, b) => {
    const direction = dbSort.dir === "asc" ? 1 : -1;
    if (dbSort.key === "name") return direction * a.label.localeCompare(b.label);
    return direction * (dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
  });
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

  // ── Tab config ───────────────────────────────────────────────────────────
  // Database and Chat are admin-only sources (enforced server-side too —
  // this is defense-in-depth, not the actual access control).
  const allTabs: { id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "files", label: "Files", icon: <span className="material-symbols-outlined text-[18px] leading-none">description</span> },
    { id: "link", label: "Public Link", icon: <span className="material-symbols-outlined text-[18px] leading-none">link</span> },
    { id: "chat", label: "Chat", icon: <span className="material-symbols-outlined text-[18px] leading-none">chat_bubble</span>, adminOnly: true },
    { id: "database", label: "Database", icon: <span className="material-symbols-outlined text-[18px] leading-none">database</span>, adminOnly: true },
  ];
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  // ── File list row ────────────────────────────────────────────────────────
  const FileRow = ({
    file,
    onDelete,
    isPdf = false,
    onPreview,
    onToggleExpand,
    expanded,
    onToggleActive,
  }: {
    file: SourceFile;
    onDelete: () => void;
    isPdf?: boolean;
    onPreview?: () => void;
    onToggleExpand?: () => void;
    expanded?: boolean;
    onToggleActive?: () => void;
  }) => {
    const isInactive = file.status === "success" && file.active === false;
    const accent =
      file.status === "uploading" ? "bg-primary" : file.status === "error" ? "bg-red-400" : isInactive ? "bg-muted-foreground/30" : "bg-emerald-500";
    const iconWrap =
      file.status === "uploading" ? "bg-primary/10" : file.status === "error" ? "bg-red-500/10" : isInactive ? "bg-muted" : "bg-emerald-500/10";

    return (
    <div className="relative flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl bg-card hover:bg-muted/30 group transition-colors border border-border/60 overflow-hidden">
      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${accent}`} />
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconWrap}`}>
        <StatusIcon status={file.status} />
      </div>
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
          className="shrink-0"
          aria-label={file.active !== false ? "Deactivate source" : "Activate source"}
        />
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
    );
  };

  const TableRow = ({ table }: { table: DbTableInfo }) => {
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
            <span className="material-symbols-outlined text-muted-foreground shrink-0" style={{ fontSize: 16 }}>database</span>
          )}
          <p className="text-sm font-bold font-['Manrope'] text-foreground flex-1 truncate">
            {table.name}
          </p>
          <p className="text-[11px] text-muted-foreground/60 font-['Inter'] shrink-0">
            {[
              table.row_count !== undefined ? `${table.row_count} rows` : null,
              table.columns ? `${table.columns.length} cols` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {expanded && table.columns && table.columns.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2 pl-11 space-y-1.5 bg-muted/20">
            {table.columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                <span className="font-mono text-muted-foreground">{col.name}</span>
                <Badge variant="outline" className="rounded-full text-[10px] px-1 py-0">{col.type}</Badge>
                {col.nullable === false && (
                  <Badge variant="secondary" className="rounded-full text-[10px] px-1 py-0">NOT NULL</Badge>
                )}
                {col.primary_key && (
                  <Badge className="rounded-full text-[10px] px-1 py-0 bg-primary text-primary-foreground">PK</Badge>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-['Manrope'] text-2xl font-extrabold text-foreground">
            Sources
          </h2>
          <p className="font-['Inter'] text-muted-foreground text-sm mt-1">
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
                "flex items-center gap-2 px-5 py-2 rounded-xl font-['Manrope'] font-bold text-sm transition-all",
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
        {activeTab === "files" && (
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

        {/* ── Public Link tab ─────────────────────────────────────────── */}
        {activeTab === "link" && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
            {loadingPublicLinks ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
              </div>
            ) : linkSources.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-5xl leading-none">link</span>}
                label="Attach Google Drive / public links as sources"
                uploadLabel="Add Link"
                onUpload={() => {
                  setPdfLinkError(null);
                  setPdfLinkDialogOpen(true);
                }}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <SortBar
                    sort={linkSort}
                    onToggle={(k) => toggleSort(linkSort, k, setLinkSort)}
                  />
                  <Button
                    onClick={() => {
                      setPdfLinkError(null);
                      setPdfLinkDialogOpen(true);
                    }}
                    className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs sm:shrink-0"
                  >
                    <Link2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    Add Link
                  </Button>
                </div>
                <div className="space-y-2.5">
                  <Accordion type="multiple" value={expandedPublicLinks} className="space-y-2">
                    {linkSources.map((link) => {
                      const isActive = activePublicLinkIds.has(link.link_id);

                      return (
                        <AccordionItem
                          key={link.link_id}
                          value={link.link_id}
                          className="relative overflow-hidden rounded-xl bg-card border border-border/60 px-4"
                        >
                          <span
                            className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                          />
                          <AccordionTrigger
                            className="-mx-4 px-4 py-3 rounded-xl hover:bg-muted/30 hover:no-underline transition-colors"
                            onClick={() => togglePublicLinkExpansion(link.link_id)}
                          >
                            <div className="flex items-center gap-3 min-w-0 w-full">
                              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                                <span className={`material-symbols-outlined text-[16px] ${isActive ? "text-emerald-500" : "text-muted-foreground/50"}`}>link</span>
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-sm font-bold font-['Manrope'] text-foreground truncate" title={link.title}>
                                  {link.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground/60 font-['Inter'] truncate" title={link.url}>
                                  {link.url}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
                                {link.item_count} items
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-3">
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                                  Added {dayjs(link.created_at).format("DD MMM YYYY, HH:mm")}
                                </p>
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={isActive}
                                    onCheckedChange={(checked) => togglePublicLinkActive(link.link_id, checked)}
                                    aria-label={isActive ? "Deactivate link" : "Activate link"}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deletePublicLink(link.link_id)}
                                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {link.items.length === 0 ? (
                                <p className="text-xs text-muted-foreground/60 font-['Inter']">
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
          <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
            {loadingTelegramConnections ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
              </div>
            ) : telegramConnections.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-5xl leading-none">chat_bubble</span>}
                label="Connect Telegram to pull existing chat history in as a live, re-syncable source"
                uploadLabel="Connect Telegram"
                uploadIcon={<Send className="h-4 w-4" />}
                onUpload={() => {
                  setTelegramDialogConnection(null);
                  setTelegramDialogOpen(true);
                }}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <p className="text-sm text-muted-foreground font-['Inter']">
                    {telegramConnections.length} connection{telegramConnections.length !== 1 ? "s" : ""}
                  </p>
                  <Button
                    onClick={() => {
                      setTelegramDialogConnection(null);
                      setTelegramDialogOpen(true);
                    }}
                    className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs sm:shrink-0"
                  >
                    <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    Connect Telegram
                  </Button>
                </div>
                <div className="space-y-3">
                  {telegramConnections.map((conn) => {
                    const isActive = conn.status === "active";
                    const isExpanded = expandedTelegramConnections.has(conn.connection_id);
                    return (
                      <div key={conn.connection_id} className="relative rounded-xl bg-card border border-border/60 overflow-hidden">
                        <span
                          className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                        />
                        <div
                          className="flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors group"
                          onClick={() => toggleTelegramConnectionExpansion(conn.connection_id)}
                        >
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                            <Send className={`h-4 w-4 ${isActive ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold font-['Manrope'] text-foreground truncate">
                              {conn.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                              {conn.phone_masked} · {conn.selected_chats.length} chat{conn.selected_chats.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border/60 bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2 px-1">
                              <p className="text-xs text-muted-foreground font-['Inter']">
                                Connected {dayjs(conn.created_at).format("DD MMM YYYY, HH:mm")}
                              </p>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={(checked) => toggleTelegramConnectionActive(conn.connection_id, checked)}
                                  aria-label={isActive ? "Deactivate connection" : "Activate connection"}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteTelegramConnection(conn.connection_id)}
                                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {conn.selected_chats.length === 0 ? (
                              <p className="px-1 py-2 text-xs text-muted-foreground/60 font-['Inter']">
                                No chats synced yet — add some below.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {conn.selected_chats.map((sc) => {
                                  const syncKey = `${conn.connection_id}:${sc.dialog_id}`;
                                  const syncing = syncingTelegramChats.has(syncKey);
                                  return (
                                    <div
                                      key={sc.dialog_id}
                                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-card border border-border/60"
                                    >
                                      <span className="flex-1 min-w-0 text-sm font-medium font-['Manrope'] truncate">{sc.title}</span>
                                      <span className="text-[10px] font-['Inter'] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60 shrink-0">
                                        {sc.message_count ?? 0} messages
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={syncing}
                                        onClick={() => syncTelegramChats(conn.connection_id, [sc.dialog_id])}
                                        className="h-7 text-[11px] font-['Manrope'] font-semibold gap-1 shrink-0"
                                      >
                                        {syncing ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3" />
                                        )}
                                        Sync
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTelegramDialogConnection(conn);
                                setTelegramDialogOpen(true);
                              }}
                              className="h-8 text-xs font-['Manrope'] font-semibold gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add more chats
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <TelegramConnectDialog
          open={telegramDialogOpen}
          onOpenChange={setTelegramDialogOpen}
          existingConnection={telegramDialogConnection}
          onDone={() => fetchTelegramConnections()}
        />

        {/* ── Database tab ─────────────────────────────────────────────── */}
        {activeTab === "database" && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] p-4 sm:p-6">
            {loadingDbConnections ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
              </div>
            ) : dbConnections.length === 0 ? (
              <EmptyState
                icon={<span className="material-symbols-outlined text-5xl leading-none">database</span>}
                label="Connect your own PostgreSQL database to use it as a knowledge source."
                uploadLabel="Connect Database"
                uploadIcon={<Database className="h-4 w-4" />}
                onUpload={() => setDbDialogOpen(true)}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <SortBar
                    sort={dbSort}
                    onToggle={(k) => toggleSort(dbSort, k, setDbSort)}
                  />
                  <Button
                    onClick={() => setDbDialogOpen(true)}
                    className="w-full sm:w-auto h-11 sm:h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-1.5 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all text-sm sm:text-xs sm:shrink-0"
                  >
                    <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    Connect Database
                  </Button>
                </div>
                <div className="space-y-3">
                {sortedDbConnections.map((conn) => {
                  const isActive = conn.status === "active";
                  const isExpanded = expandedDbConnections.has(conn.connection_id);
                  const isLoadingTables = loadingTablesFor.has(conn.connection_id);
                  const tableError = dbTableErrors[conn.connection_id];
                  return (
                    <div key={conn.connection_id} className="relative rounded-xl bg-card border border-border/60 overflow-hidden">
                      <span
                        className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                      />
                      {/* Connection header */}
                      <div className="flex items-center gap-3 pl-4 pr-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                        onClick={() => toggleDbConnectionExpansion(conn.connection_id)}>
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-emerald-500/10" : "bg-muted"}`}>
                          {isActive
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            : <span className="material-symbols-outlined text-muted-foreground/50" style={{ fontSize: 16 }}>database</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold font-['Manrope'] text-foreground truncate">
                            {conn.label}
                          </p>
                          <div className="flex items-center gap-1 min-w-0">
                            <p
                              className="text-[11px] text-muted-foreground/60 font-['Inter'] truncate"
                              title={revealedConnUrls.has(conn.connection_id) ? conn.url : undefined}
                            >
                              {revealedConnUrls.has(conn.connection_id)
                                ? conn.url
                                : maskConnectionUrl(conn.url)}
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleConnUrlReveal(conn.connection_id); }}
                              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                              aria-label={revealedConnUrls.has(conn.connection_id) ? "Hide connection URL" : "Show connection URL"}
                            >
                              {revealedConnUrls.has(conn.connection_id) ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); refreshConnectionTables(conn.connection_id); }}
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-primary font-['Manrope'] font-bold px-2 py-1 rounded-full hover:bg-primary/10"
                          >
                            Refresh
                          </button>
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Table list */}
                      {isExpanded && (
                        <div className="border-t border-border/60 bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2 px-1">
                            <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                              Connected {dayjs(conn.created_at).format("DD MMM YYYY, HH:mm")}
                            </p>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => toggleDbConnectionActive(conn.connection_id, checked)}
                                aria-label={isActive ? "Deactivate connection" : "Activate connection"}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteDbConnection(conn.connection_id)}
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {isLoadingTables ? (
                            <div className="flex items-center gap-2 px-2 py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
                              <span className="text-xs text-muted-foreground/60 font-['Inter']">Loading tables…</span>
                            </div>
                          ) : tableError ? (
                            <div className="flex items-center gap-2 px-2 py-4 text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs font-['Inter']">{tableError}</span>
                            </div>
                          ) : conn.tables.length === 0 ? (
                            <p className="px-2 py-4 text-xs text-muted-foreground/60 font-['Inter']">No tables found.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {conn.tables.map((t) => (
                                <TableRow key={t.name} table={t} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </>
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

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">Label</label>
              <Input
                placeholder="Analytics DB"
                value={dbLabel}
                onChange={(e) => setDbLabel(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60 font-['Inter']">Optional. Derived from the host if left blank.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-['Manrope'] text-muted-foreground">PostgreSQL connection URL</label>
              <div className="relative">
                <Input
                  type={dbUrlVisible ? "text" : "password"}
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  value={dbUrl}
                  onChange={(e) => {
                    setDbUrl(e.target.value);
                    if (dbFormError) setDbFormError(null);
                  }}
                  className="h-9 text-sm font-mono pr-9"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setDbUrlVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label={dbUrlVisible ? "Hide connection URL" : "Show connection URL"}
                >
                  {dbUrlVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60 font-['Inter']">
                Your own database — used as a real-time knowledge source, separate from the app&apos;s own storage.
                This contains a password — keep it hidden on shared screens.
              </p>
            </div>

            {dbFormError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {dbFormError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDbDialogOpen(false); setDbFormError(null); setDbUrlVisible(false); }}
              className="rounded-xl font-['Manrope'] font-semibold">
              Cancel
            </Button>
            <Button onClick={handleDbConnect} disabled={connectingDb}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all">
              {connectingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {connectingDb ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
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
              className="rounded-xl font-['Manrope'] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConnectLinkOnly}
              disabled={savingPublicLink}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-['Manrope'] font-bold gap-2 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] hover:-translate-y-px transition-all"
            >
              {savingPublicLink && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingPublicLink ? "Saving..." : "Save Link Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}