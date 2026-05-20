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
  ChatCollectionsApi,
  ChatUploadApi,
  ChatCollectionApi,
} from "@/services";
import type {
  PdfCollection,
  UploadResponse,
  ChatCollection,
  ChatUploadResponse,
  DeleteResponse,
} from "@/services";

const MAX_FILES_PER_SECTION = 20;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

type UploadStatus = "uploading" | "success" | "error";
type SortKey = "name" | "date";
type SortDir = "asc" | "desc";
type Tab = "pdf" | "chat" | "database";

interface SourceFile {
  id: string;
  name: string;
  uploadedAt: dayjs.Dayjs;
  status: UploadStatus;
  collectionId?: string;
  meta?: string; // e.g. doc count, message count
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
        "flex items-center gap-1 text-xs font-semibold font-[Manrope] px-2 py-1 rounded-md transition-colors",
        active
          ? "text-[#0053db] bg-[#eef3ff]"
          : "text-[#566166] hover:bg-[#f0f4f7]",
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
    return <Loader2 className="h-4 w-4 text-[#0053db] animate-spin shrink-0" />;
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
}

function EmptyState({
  icon,
  label,
  onUpload,
  isDb,
  onDbConnect,
}: {
  icon: React.ReactNode;
  label: string;
  onUpload?: () => void;
  isDb?: boolean;
  onDbConnect?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-[#a9b4b9]">
      <div className="mb-4 opacity-30">{icon}</div>
      <p className="font-[Manrope] font-bold text-[#566166] text-base mb-1">
        No data yet, upload to get started
      </p>
      <p className="text-sm font-[Inter] mb-6">{label}</p>
      {isDb ? null : (
        <Button
          onClick={onUpload}
          variant="outline"
          className="font-[Manrope] font-semibold gap-2 border-[#d0dbe2] text-[#566166]"
        >
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      )}
    </div>
  );
}

export function SourcesPanel({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  onPdfCollectionsChange,
  onChatCollectionsChange,
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
  const [connectMode, setConnectMode] = useState<ConnectMode>("url");
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
        const files: SourceFile[] = data.map((col) => ({
          id: col.collection_id,
          name:
            col.file_names?.[0]
              ?.replace(/\.pdf$/i, "")
              .replace(/[_-]/g, " ") ?? "Untitled",
          uploadedAt: dayjs(col.created_at),
          status: "success",
          collectionId: col.collection_id,
          meta: `${col.document_count} doc${col.document_count !== 1 ? "s" : ""}`,
        }));
        setPdfFiles(files);
        setCachedPdfFiles(files.map((f) => ({ ...f, uploadedAt: f.uploadedAt.toISOString() })));
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
  }, []);

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
      PdfUploadApi.store<UploadResponse>(formData)
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

  const pdfAtMax =
    pdfFiles.filter((f) => f.status !== "error").length >= MAX_FILES_PER_SECTION;
  const chatAtMax =
    chatFiles.filter((f) => f.status !== "error").length >= MAX_FILES_PER_SECTION;

  // ── Tab config ───────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pdf", label: "PDF File", icon: <FileText className="h-4 w-4" /> },
    { id: "chat", label: "Chat (.txt)", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "database", label: "Database", icon: <Database className="h-4 w-4" /> },
  ];

  // ── File list row ────────────────────────────────────────────────────────
  const FileRow = ({
    file,
    onDelete,
  }: {
    file: SourceFile;
    onDelete: () => void;
  }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-[#f7f9fb] group transition-colors border border-[#edf1f4]">
      <StatusIcon status={file.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-[Manrope] text-[#2a3439] truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-[#a9b4b9] font-[Inter]">
            {file.uploadedAt.format("DD MMM YYYY, HH:mm")}
          </span>
          {file.meta && file.status === "success" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {file.meta}
            </Badge>
          )}
          {file.status === "error" && (
            <span className="text-[11px] text-red-400 font-[Inter]">
              Upload failed
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[#a9b4b9] hover:text-red-500 hover:bg-red-50"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const TableRow = ({ table }: { table: DbTable }) => {
    const expanded = expandedTables.has(table.name);
    return (
      <div className="rounded-xl bg-white border border-[#edf1f4] overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f7f9fb] transition-colors"
          onClick={() => toggleTable(table.name)}
        >
          {table.columns?.length ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-[#566166] shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#566166] shrink-0" />
            )
          ) : (
            <Database className="h-4 w-4 text-[#566166] shrink-0" />
          )}
          <p className="text-sm font-semibold font-[Manrope] text-[#2a3439] flex-1 truncate font-mono">
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
          <div className="border-t border-[#edf1f4] px-4 py-2 pl-11 space-y-1.5 bg-[#f7f9fb]">
            {table.columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[#566166]">{col.name}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{col.type}</Badge>
                {col.nullable === false && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">NOT NULL</Badge>
                )}
                {col.primary_key && (
                  <Badge className="text-[10px] px-1 py-0 bg-[#0053db]">PK</Badge>
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
      <span className="text-xs text-[#a9b4b9] font-[Inter] mr-1">Sort:</span>
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
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 pt-10 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-[Manrope] text-3xl font-extrabold text-[#2a3439] tracking-tight mb-1">
            Sources
          </h2>
          <p className="font-[Inter] text-[#566166] text-sm">
            Manage all your information source here
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-[#edf1f4] p-1 rounded-xl w-fit mb-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg font-[Manrope] font-semibold text-sm transition-all",
                activeTab === t.id
                  ? "bg-white shadow text-[#0053db]"
                  : "text-[#566166] hover:text-[#2a3439]",
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
                <Loader2 className="h-7 w-7 animate-spin text-[#a9b4b9]" />
              </div>
            ) : pdfFiles.length === 0 ? (
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
                      className="bg-[#0053db] hover:bg-[#0048c1] font-[Manrope] font-semibold gap-1.5 h-8 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Upload PDF
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {sortedPdf.map((f) => (
                    <FileRow key={f.id} file={f} onDelete={() => deletePdf(f)} />
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

        {/* ── Chat tab ─────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div>
            {loadingChat ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-[#a9b4b9]" />
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
                      className="bg-[#0053db] hover:bg-[#0048c1] font-[Manrope] font-semibold gap-1.5 h-8 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Upload Chat
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {sortedChat.map((f) => (
                    <FileRow key={f.id} file={f} onDelete={() => deleteChat(f)} />
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
              <p className="text-sm text-[#566166] font-[Inter]">
                {dbConnections.length > 0
                  ? `${dbConnections.length} connection${dbConnections.length !== 1 ? "s" : ""}`
                  : "Add a database connection to browse its tables"}
              </p>
              <Button
                size="sm"
                onClick={() => setDbDialogOpen(true)}
                className="bg-[#0053db] hover:bg-[#0048c1] font-[Manrope] font-semibold gap-1.5 h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Connect Database
              </Button>
            </div>

            {dbConnections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#a9b4b9]">
                <Database className="h-16 w-16 mb-4 opacity-30" />
                <p className="font-[Manrope] font-bold text-[#566166] text-base mb-1">
                  No connections yet
                </p>
                <p className="text-sm font-[Inter] text-center max-w-xs">
                  Paste a PostgreSQL URL or fill in manual credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dbConnections.map((conn) => (
                  <div key={conn.id} className="rounded-xl bg-white border border-[#edf1f4] overflow-hidden">
                    {/* Connection header */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f7f9fb] transition-colors group"
                      onClick={() => toggleConnection(conn.id)}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-[Manrope] text-[#2a3439] truncate font-mono">
                          {conn.label}
                        </p>
                        <p className="text-[11px] text-[#a9b4b9] font-[Inter]">
                          Connected {conn.connectedAt.format("DD MMM YYYY, HH:mm")}
                          {conn.tables.length > 0 && ` · ${conn.tables.length} tables`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); fetchTablesForConnection(conn.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#566166] hover:text-[#0053db] font-[Manrope] font-semibold px-2 py-1 rounded-md hover:bg-[#eef3ff]"
                        >
                          Refresh
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[#a9b4b9] hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {conn.expanded
                          ? <ChevronDown className="h-4 w-4 text-[#566166]" />
                          : <ChevronRight className="h-4 w-4 text-[#566166]" />}
                      </div>
                    </div>

                    {/* Table list */}
                    {conn.expanded && (
                      <div className="border-t border-[#edf1f4] bg-[#f7f9fb]">
                        {conn.loadingTables ? (
                          <div className="flex items-center gap-2 px-5 py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-[#a9b4b9]" />
                            <span className="text-xs text-[#a9b4b9] font-[Inter]">Loading tables…</span>
                          </div>
                        ) : conn.error ? (
                          <div className="flex items-center gap-2 px-5 py-4 text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-[Inter]">{conn.error}</span>
                          </div>
                        ) : conn.tables.length === 0 ? (
                          <p className="px-5 py-4 text-xs text-[#a9b4b9] font-[Inter]">No tables found.</p>
                        ) : (
                          <div className="divide-y divide-[#edf1f4]">
                            {conn.tables.map((t) => (
                              <div key={t.name} className="px-5 py-2.5 flex items-center gap-3">
                                <Database className="h-3.5 w-3.5 text-[#a9b4b9] shrink-0" />
                                <span className="text-xs font-mono font-semibold text-[#2a3439] flex-1">{t.name}</span>
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
        <DialogContent className="sm:max-w-md font-[Inter]">
          <DialogHeader>
            <DialogTitle className="font-[Manrope] font-extrabold text-[#2a3439]">
              Connect Database
            </DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#f0f4f7] p-1 rounded-lg w-fit mb-2">
            {(["url", "manual"] as ConnectMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setConnectMode(m); setDbFormError(null); }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-semibold font-[Manrope] transition-all",
                  connectMode === m ? "bg-white shadow text-[#0053db]" : "text-[#566166]",
                )}
              >
                {m === "url" ? "Connection URL" : "Manual"}
              </button>
            ))}
          </div>

          <div className="space-y-3 py-1">
            {connectMode === "url" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-[Manrope] text-[#455367]">PostgreSQL URL</label>
                <Input
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[11px] text-[#a9b4b9] font-[Inter]">Paste your full connection string</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold font-[Manrope] text-[#455367]">Host</label>
                    <Input placeholder="localhost" value={dbManual.host}
                      onChange={(e) => setDbManual((p) => ({ ...p, host: e.target.value }))}
                      className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold font-[Manrope] text-[#455367]">Port</label>
                    <Input placeholder="5432" value={dbManual.port}
                      onChange={(e) => setDbManual((p) => ({ ...p, port: e.target.value }))}
                      className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-[Manrope] text-[#455367]">Database name</label>
                  <Input placeholder="postgres" value={dbManual.dbname}
                    onChange={(e) => setDbManual((p) => ({ ...p, dbname: e.target.value }))}
                    className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-[Manrope] text-[#455367]">Username</label>
                  <Input placeholder="postgres" value={dbManual.username}
                    onChange={(e) => setDbManual((p) => ({ ...p, username: e.target.value }))}
                    className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold font-[Manrope] text-[#455367]">Password</label>
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
              className="font-[Manrope] font-semibold">
              Cancel
            </Button>
            <Button onClick={handleDbConnect} disabled={connectingDb}
              className="bg-[#0053db] hover:bg-[#0048c1] font-[Manrope] font-semibold gap-2">
              {connectingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {connectingDb ? "Connecting…" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}