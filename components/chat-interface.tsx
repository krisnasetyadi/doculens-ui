"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { HybridQueryApi, AvailableModelsApi, SessionsApi, PublicLinksApi, DatabaseConnectionsApi } from "@/services";
import { useToast } from "@/hooks/use-toast";
import type {
  HybridResponse,
  HybridQueryRequest,
  AvailableModelsResponse,
  LLMProvider,
  PdfSourceInfo,
  SessionResponse,
  UpsertSessionRequest,
  PublicLinkSource,
  PublicLinksResponse,
  DatabaseConnectionSource,
  DatabaseConnectionsResponse,
} from "@/services";
import {
  Loader2,
  ExternalLink,
  Eye,
  ChevronDown,
  FileText,
  Database,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types
interface PdfViewerState {
  open: boolean;
  pdfUrl: string;
  fileName: string;
  page?: number;
  searchText?: string;
  contentPreview?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  sources?: {
    pdf_sources?: string[];
    pdf_sources_detailed?: PdfSourceInfo[];
    db_results?: Record<
      string,
      {
        table: string;
        data: any[];
        record_count: number;
        avg_relevance_score?: number | null;
      }
    >;
    chat_results?: any[];
    processing_time?: number;
    search_terms?: string[];
    target_tables?: string[];
  };
}

type ResearchMode = "General" | "Project Context" | "Policy" | "Deep Research";

interface ChatInterfaceProps {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  selectedPublicLinkIds?: string[];
  selectedDbConnectionIds?: string[];
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
  initialSessionId?: string;  // load an existing session from backend
}

export function ChatInterface({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  selectedPublicLinkIds = [],
  selectedDbConnectionIds = [],
  pendingQuestion,
  onPendingQuestionConsumed,
  initialSessionId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(!!initialSessionId);
  const [researchMode, setResearchMode] = useState<ResearchMode>("General");
  const [includePdf, setIncludePdf] = useState(true);
  const [includeDb, setIncludeDb] = useState(false);
  const [includeChat, setIncludeChat] = useState(false);
  const [includePublicLink, setIncludePublicLink] = useState(true);
  const [activePublicLinkIds, setActivePublicLinkIds] = useState<string[]>([]);
  const [activeDbConnectionIds, setActiveDbConnectionIds] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>(
    "gemini-2.5-flash",
  );
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const sessionIdRef = useRef<string | undefined>(initialSessionId);

  // Load existing session from backend
  useEffect(() => {
    if (!initialSessionId) return;
    setSessionLoading(true);
    SessionsApi.find<SessionResponse>(initialSessionId)
      .then((data) => {
        const restored: Message[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          modelUsed: m.model_used,
        }));
        setMessages(restored);
        sessionIdRef.current = data.session_id;
      })
      .catch(() => {
        toast({ title: "Could not load session", variant: "destructive" });
      })
      .finally(() => setSessionLoading(false));
  }, [initialSessionId]);

  const [pdfViewer, setPdfViewer] = useState<PdfViewerState>({
    open: false,
    pdfUrl: "",
    fileName: "",
  });

  useEffect(() => {
    // Only load the models list for the dropdown — do NOT override selectedProvider/selectedModel
    // so our "gemini-2.5-flash" default is always preserved.
    AvailableModelsApi.get<AvailableModelsResponse>()
      .then((data) => setAvailableModels(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch active public links so their ids are always available as query
    // params, even if the user never opened the Sources panel this session.
    PublicLinksApi.get<PublicLinksResponse | PublicLinkSource[]>()
      .then((raw) => {
        const links = Array.isArray(raw) ? raw : raw.links ?? [];
        setActivePublicLinkIds(
          links.filter((link) => link.status === "active").map((link) => link.link_id),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Same idea for database connections — always have active ids on hand.
    DatabaseConnectionsApi.get<DatabaseConnectionsResponse | DatabaseConnectionSource[]>()
      .then((raw) => {
        const connections = Array.isArray(raw) ? raw : raw.connections ?? [];
        setActiveDbConnectionIds(
          connections.filter((c) => c.status === "active").map((c) => c.connection_id),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const openPdfViewer = (source: PdfSourceInfo) => {
    if (!source.file_url) {
      toast({
        title: "PDF URL Tidak Valid",
        description: `File ${source.file_name} tidak memiliki URL yang valid.`,
        variant: "destructive",
      });
      return;
    }
    fetch(source.file_url, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setPdfViewer({
          open: true,
          pdfUrl: source.file_url ?? "",
          fileName: source.file_name,
          page: source.page,
          searchText: source.search_text,
          contentPreview: source.content_preview,
        });
      })
      .catch((err) =>
        toast({
          title: "PDF Tidak Dapat Diakses",
          description: err.message,
          variant: "destructive",
        }),
      );
  };

  const deriveSourceMode = () => {
    const enabled = [
      includePdf ? "pdf" : null,
      includeDb ? "database" : null,
      includeChat ? "chat" : null,
      includePublicLink ? "public_link" : null,
    ].filter(Boolean) as Array<"pdf" | "database" | "chat" | "public_link">;

    if (enabled.length === 0) return "none" as const;
    if (enabled.length === 1) return enabled[0];
    return "mixed" as const;
  };

  const buildRequest = (question: string): HybridQueryRequest => {
    const linkIds =
      selectedPublicLinkIds.length > 0 ? selectedPublicLinkIds : activePublicLinkIds;
    const dbIds =
      selectedDbConnectionIds.length > 0 ? selectedDbConnectionIds : activeDbConnectionIds;
    return {
      question,
      include_pdf_results: includePdf,
      // The "DB" toggle queries the user's own connected database(s) from
      // Sources > Database — not the app's internal storage.
      include_external_db: includeDb,
      external_db_connection_ids: includeDb && dbIds.length > 0 ? dbIds : undefined,
      include_chat_results: includeChat,
      include_public_links: includePublicLink,
      public_link_ids: includePublicLink && linkIds.length > 0 ? linkIds : undefined,
      source_mode: deriveSourceMode(),
      llm_provider: selectedProvider,
      llm_model: selectedModel,
      pdf_collection_ids:
        selectedPdfCollections.length > 0 ? selectedPdfCollections : undefined,
      chat_collection_ids:
        selectedChatCollections.length > 0 ? selectedChatCollections : undefined,
    };
  };

  const saveSession = (msgs: typeof messages) => {
    if (msgs.length === 0) return;
    const firstUser = msgs.find((m) => m.role === "user");
    const title = firstUser
      ? firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? "…" : "")
      : "Untitled conversation";
    const now = new Date().toISOString();

    // Persist to backend DB only — no localStorage
    const payload: UpsertSessionRequest = {
      title,
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model_used: m.modelUsed,
        created_at: now,
      })),
      pdf_collections: selectedPdfCollections,
      chat_collections: selectedChatCollections,
    };

    if (sessionIdRef.current) {
      payload.session_id = sessionIdRef.current;
    }

    SessionsApi.store<SessionResponse>(
      payload as unknown as Record<string, unknown>,
    )
      .then((saved) => {
        if (saved?.session_id) {
          sessionIdRef.current = saved.session_id;
        }
      })
      .catch(() => {});
  };

  const appendAssistantMessage = (data: HybridResponse) => {
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: data.answer,
          modelUsed: data.model_used,
          sources: {
            pdf_sources: data.pdf_sources,
            pdf_sources_detailed: data.pdf_sources_detailed,
            db_results: data.db_results as any,
            chat_results: data.chat_results,
            processing_time: data.processing_time,
            search_terms: data.search_terms,
            target_tables: data.target_tables,
          },
        },
      ];
      // Persist after state update
      setTimeout(() => saveSession(next), 0);
      return next;
    });
  };

  const runQuery = (question: string) => {
    setLoading(true);
    HybridQueryApi.store<HybridResponse>(
      buildRequest(question) as unknown as Record<string, unknown>,
    )
      .then((data: HybridResponse) => appendAssistantMessage(data))
      .catch(() =>
        toast({
          title: "Error",
          description: "Query failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!pendingQuestion?.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: pendingQuestion.trim(),
      },
    ]);
    onPendingQuestionConsumed?.();
    runQuery(pendingQuestion.trim());
  }, [pendingQuestion]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: question },
    ]);
    setInput("");
    runQuery(question);
  };

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const hasConversation = messages.length > 0;
  const researchModes: ResearchMode[] = [
    "General",
    "Project Context",
    "Policy",
    "Deep Research",
  ];

  // Session restore loading state
  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-['Inter']">Restoring conversation…</p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Center scroll area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto px-8 py-10 w-full flex flex-col space-y-8 pb-48">
            {!hasConversation ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
                </div>
                <h2 className="font-['Manrope'] text-xl font-bold text-foreground mb-2">Ask anything about your documents</h2>
                <p className="text-muted-foreground font-['Inter'] max-w-sm text-sm">Search across PDFs, databases, and chat logs using natural language</p>
              </div>
            ) : (
              messages.map((message) => (
                <section key={message.id} className="space-y-6">
                  {message.role === "user" && (
                    <div className="flex items-start space-x-4">
                      <Avatar className="mt-1 w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary">
                          <span className="material-symbols-outlined text-sm">person</span>
                        </AvatarFallback>
                      </Avatar>
                      <h1 className="font-['Manrope'] text-2xl font-bold text-foreground leading-tight">
                        {message.content}
                      </h1>
                    </div>
                  )}
                  {message.role === "assistant" && (
                    <div className="space-y-4">
                      <div className="bg-card rounded-2xl p-7 border border-border/60 shadow-[0_4px_24px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                          <span className="material-symbols-outlined text-primary text-4xl">auto_awesome</span>
                        </div>
                        <div className="flex items-center space-x-2 text-primary mb-4">
                          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          <span className="text-[10px] font-bold tracking-widest uppercase font-['Manrope']">Synthesized Intelligence</span>
                        </div>
                        <div className="font-['Inter'] text-base text-foreground leading-relaxed prose prose-neutral dark:prose-invert max-w-none prose-headings:font-['Manrope'] prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                        {(message.modelUsed || message.sources?.processing_time) && (
                          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/50">
                            {message.modelUsed && (
                              <span className="text-[10px] font-bold font-['Manrope'] uppercase tracking-widest text-muted-foreground">🤖 {message.modelUsed}</span>
                            )}
                            {message.sources?.processing_time && (
                              <span className="text-[10px] text-muted-foreground/60">{message.sources.processing_time.toFixed(2)}s</span>
                            )}
                          </div>
                        )}
                      </div>
                      {message.sources && <SourcesSection message={message} onOpenPdfViewer={openPdfViewer} />}
                    </div>
                  )}
                </section>
              ))
            )}

            {loading && (
              <div className="flex items-start space-x-4">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-primary/15">
                    <span className="material-symbols-outlined text-primary text-sm">hub</span>
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card rounded-2xl px-5 py-3.5 border border-border/60 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-['Inter'] text-muted-foreground">Synthesizing intelligence…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        {/* Floating bottom chat bar */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-30">
          <div className="max-w-3xl mx-auto pointer-events-auto space-y-2">
            {/* Toolbar row */}
            <div className="flex items-center gap-2 px-1">
              {/* Source toggles */}
              <div className="flex items-center gap-1">
                {(
                  [
                    ["PDF", "description", includePdf, () => setIncludePdf(!includePdf)],
                    ["DB", "database", includeDb, () => setIncludeDb(!includeDb)],
                    ["Chat", "chat_bubble", includeChat, () => setIncludeChat(!includeChat)],
                    ["Drive", "link", includePublicLink, () => setIncludePublicLink(!includePublicLink)],
                  ] as [string, string, boolean, () => void][]
                ).map(([label, icon, active, toggle]) => (
                  <button
                    key={label}
                    onClick={toggle}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold font-['Manrope'] transition-all ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px] leading-none" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                {/* Model selector */}
                <div className="flex items-center gap-1 bg-muted rounded-full px-2.5 py-1">
                  <span className="material-symbols-outlined text-[12px] text-muted-foreground">smart_toy</span>
                  <select
                    value={`${selectedProvider}::${selectedModel}`}
                    onChange={(e) => {
                      const [provider, model] = e.target.value.split("::");
                      setSelectedProvider(provider as LLMProvider);
                      setSelectedModel(model);
                    }}
                    className="text-[11px] font-bold font-['Manrope'] text-muted-foreground bg-transparent border-none outline-none cursor-pointer max-w-[130px]"
                  >
                    {(
                      availableModels?.available_models?.["gemini"] ?? [
                        "gemini-2.5-flash",
                        "gemini-2.5-pro",
                        "gemini-2.0-flash",
                      ]
                    ).map((model) => (
                      <option key={`gemini::${model}`} value={`gemini::${model}`}>
                        {model.replace("gemini-", "Gemini ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Input row */}
            <div className={`flex items-center bg-card border rounded-2xl p-2 gap-2 transition-all duration-200 ${
              input ? "border-primary/40 shadow-[0_0_0_1px_rgba(74,124,255,0.2),0_8px_32px_rgba(74,124,255,0.1)]" : "border-border shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            }`}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask a follow-up…"
                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm font-['Inter'] text-foreground placeholder:text-muted-foreground/40 py-3 h-auto px-2"
              />
              <Button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                size="icon"
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_12px_rgba(74,124,255,0.35)] hover:-translate-y-px transition-all disabled:opacity-30 disabled:shadow-none disabled:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-base">send</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Traceability & Context — hidden for now */}
      <aside className="w-80 shrink-0 h-full bg-[#f0f4f7] flex flex-col overflow-y-auto custom-scrollbar p-6 hidden">
        <h2 className="font-[Manrope] text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#566166] mb-8">
          Traceability &amp; Context
        </h2>

        {lastAssistant ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="p-4 text-center gap-1 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.04)] border-none">
                <p className="text-[10px] font-bold font-[Manrope] uppercase text-[#566166] mb-1">
                  Confidence
                </p>
                <p className="text-2xl font-bold text-[#0053db]">
                  {lastAssistant.sources?.processing_time
                    ? `${Math.min(99, Math.round(90 + 1 / (lastAssistant.sources.processing_time + 0.1)))}%`
                    : "—"}
                </p>
              </Card>
              <Card className="p-4 text-center gap-1 shadow-[0_12px_32px_-4px_rgba(42,52,57,0.04)] border-none">
                <p className="text-[10px] font-bold font-[Manrope] uppercase text-[#566166] mb-1">
                  Freshness
                </p>
                <p className="text-sm font-bold text-[#2a3439]">
                  Updated Today
                </p>
              </Card>
            </div>

            {lastAssistant.sources?.pdf_sources_detailed &&
              lastAssistant.sources.pdf_sources_detailed.length > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold font-[Manrope] text-[#2a3439]">
                      Sources Used
                    </h3>
                    <span className="text-[10px] bg-[#d5e3fc] px-2 py-0.5 rounded-full text-[#455367] font-bold">
                      {lastAssistant.sources.pdf_sources_detailed.length} Docs
                    </span>
                  </div>
                  <div className="space-y-2">
                    {lastAssistant.sources.pdf_sources_detailed
                      .slice(0, 5)
                      .map((src, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl",
                            i === 0
                              ? "bg-[#dbe1ff]/50 border border-[#0053db]/10"
                              : "bg-white",
                          )}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span
                              className="material-symbols-outlined text-[#0053db] text-sm"
                              style={
                                i === 0
                                  ? { fontVariationSettings: "'FILL' 1" }
                                  : {}
                              }
                            >
                              check_circle
                            </span>
                            <span className="text-xs font-medium text-[#2a3439] truncate">
                              {src.file_name}
                            </span>
                          </div>
                          {src.page_url && (
                            <a
                              href={src.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="material-symbols-outlined text-[#0053db] text-xs">
                                open_in_new
                              </span>
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {lastAssistant.sources?.db_results &&
              Object.keys(lastAssistant.sources.db_results).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold font-[Manrope] text-[#2a3439] mb-4">
                    Database Results
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(lastAssistant.sources.db_results).map(
                      ([table, result]) => (
                        <div
                          key={table}
                          className="flex items-center justify-between p-3 bg-white rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#0053db] text-sm">
                              table_chart
                            </span>
                            <span className="text-xs font-medium text-[#2a3439] truncate">
                              {table}
                            </span>
                          </div>
                          <span className="text-[10px] bg-[#d5e3fc] px-2 py-0.5 rounded-full text-[#455367] font-bold shrink-0">
                            {result.record_count} rows
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {lastAssistant.sources?.search_terms &&
              lastAssistant.sources.search_terms.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold font-[Manrope] text-[#2a3439] mb-3">
                    Search Terms
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {lastAssistant.sources.search_terms.map((term, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[#e8eff3] text-[#455367] px-2 py-1 rounded-full font-[Inter]"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="mt-auto pt-4">
              <div className="p-4 bg-[#d9e4ea] rounded-2xl">
                <h4 className="text-xs font-bold font-[Manrope] text-[#2a3439] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    search_off
                  </span>
                  Missing Context
                </h4>
                <ul className="text-[11px] space-y-1.5 text-[#566166] font-[Inter]">
                  <li>• Add more PDFs to Sources for broader coverage</li>
                  <li>• Enable Database search for structured data</li>
                </ul>
                <Button
                  variant="outline"
                  className="w-full mt-4 py-2 border-[#0053db]/20 text-xs font-bold text-[#0053db] hover:bg-[#0053db]/5 hover:text-[#0053db] font-[Manrope] h-auto"
                >
                  Trigger Research Task
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <span className="material-symbols-outlined text-4xl text-[#a9b4b9] mb-3">
              analytics
            </span>
            <p className="text-xs font-[Inter] text-[#a9b4b9]">
              Ask a question to see traceability data here
            </p>
          </div>
        )}
      </aside>

      <PdfViewerDialog
        open={pdfViewer.open}
        onOpenChange={(open) => setPdfViewer((prev) => ({ ...prev, open }))}
        pdfUrl={pdfViewer.pdfUrl}
        fileName={pdfViewer.fileName}
        initialPage={pdfViewer.page}
        searchText={pdfViewer.searchText}
        contentPreview={pdfViewer.contentPreview}
      />
    </div>
  );
}

// Sources Section Component
function SourcesSection({
  message,
  onOpenPdfViewer,
}: {
  message: Message;
  onOpenPdfViewer: (s: PdfSourceInfo) => void;
}) {
  const { sources } = message;
  if (!sources) return null;
  const hasPdfDetailed = (sources.pdf_sources_detailed?.length ?? 0) > 0;
  const hasPdfSimple = !hasPdfDetailed && (sources.pdf_sources?.length ?? 0) > 0;
  const hasDb = Object.keys(sources.db_results ?? {}).length > 0;
  const hasChat = (sources.chat_results?.length ?? 0) > 0;
  if (!hasPdfDetailed && !hasPdfSimple && !hasDb && !hasChat) return null;

  return (
    <div className="space-y-2 pl-1">
      {hasPdfDetailed && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-xs font-['Manrope'] font-semibold text-muted-foreground hover:text-foreground w-auto">
              <FileText className="h-3.5 w-3.5 text-primary" />
              {sources.pdf_sources_detailed!.length} PDF source{sources.pdf_sources_detailed!.length !== 1 ? 's' : ''}
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 space-y-3">
              {sources.pdf_sources_detailed!.map((src, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {src.page_url ? (
                      <a href={src.page_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        {src.file_name} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-foreground">{src.file_name}</span>
                    )}
                  </div>
                  {src.content_preview && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pl-5 italic">{src.content_preview}</p>
                  )}
                  <div className="flex items-center gap-1.5 pl-5 flex-wrap">
                    {src.page && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">p.{src.page}</span>
                    )}
                    {src.relevance_score && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{(src.relevance_score * 100).toFixed(0)}% match</span>
                    )}
                    {src.file_url && (
                      <button onClick={() => onOpenPdfViewer(src)} className="text-[10px] text-primary hover:bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors font-semibold">
                        <Eye className="h-3 w-3" /> View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasPdfSimple && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-xs font-['Manrope'] font-semibold text-muted-foreground hover:text-foreground w-auto">
              <FileText className="h-3.5 w-3.5 text-primary" />
              {sources.pdf_sources!.length} PDF source{sources.pdf_sources!.length !== 1 ? 's' : ''}
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 space-y-2">
              {sources.pdf_sources!.map((src, idx) => (
                <p key={idx} className="text-xs text-foreground font-medium pb-2 border-b border-border/40 last:border-0 last:pb-0">{src}</p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {hasDb && Object.entries(sources.db_results!).map(([tableName, result]) => (
        <Collapsible key={tableName} defaultOpen={result.data.length <= 3}>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-xs font-['Manrope'] font-semibold text-muted-foreground hover:text-foreground w-auto">
              <Database className="h-3.5 w-3.5 text-primary" />
              {tableName}
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">{result.record_count}</span>
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.data.length > 0 && Object.keys(result.data[0]).filter((k) => !k.includes('_vector')).slice(0, 6).map((k) => (
                      <TableHead key={k} className="text-xs font-semibold h-8">{k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row).filter(([k]) => !k.includes('_vector')).slice(0, 6).map(([k, v]) => (
                        <TableCell key={k} className="text-xs py-2">
                          {k === 'relevance_score' && typeof v === 'number' ? v.toFixed(2)
                            : k.includes('created_at') || k.includes('updated_at') ? new Date(v as string).toLocaleDateString()
                            : String(v).length > 50 ? String(v).substring(0, 50) + '\u2026'
                            : String(v)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.data.length > 10 && (
                <p className="text-xs text-muted-foreground/50 text-center mt-2 pt-2 border-t border-border/40">Showing 10 of {result.data.length} records</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {hasChat && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-xs font-['Manrope'] font-semibold text-muted-foreground hover:text-foreground w-auto">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              {sources.chat_results!.length} chat context{sources.chat_results!.length !== 1 ? 's' : ''}
              <ChevronDown className="h-3 w-3 ml-1 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-card border border-border/60 rounded-xl p-4 space-y-3">
              {sources.chat_results!.map((chat, idx) => (
                <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{chat.source}</span>
                    {chat.platform && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{chat.platform}</span>}
                    {chat.relevance_score && <span className="text-[10px] text-muted-foreground/50">{(chat.relevance_score * 100).toFixed(0)}% match</span>}
                  </div>
                  {chat.participants && <p className="text-[10px] text-muted-foreground">👥 {chat.participants}</p>}
                  <p className="text-[11px] text-muted-foreground line-clamp-3 italic">{chat.content_preview}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
