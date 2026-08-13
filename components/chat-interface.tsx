"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog";
import { GapAnalysisDialog } from "@/components/gap-analysis-dialog";
import {
  HybridQueryApi,
  AvailableModelsApi,
  SessionsApi,
  PdfCollectionsApi,
  GapAnalysisRunsApi,
} from "@/services";
import { useToast } from "@/hooks/use-toast";
import { useSourceInventory } from "@/hooks/use-source-inventory";
import { SourceChip } from "@/components/source-chip";
import type {
  HybridResponse,
  HybridQueryRequest,
  AvailableModelsResponse,
  LLMProvider,
  PdfSourceInfo,
  SessionResponse,
  UpsertSessionRequest,
  PdfCollection,
  GapAnalysisRun,
} from "@/services";
import {
  Loader2,
  ExternalLink,
  Eye,
  ChevronDown,
  FileText,
  Database,
  MessageSquare,
  Users,
  Copy,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const SUGGESTED_QUESTIONS = [
  "Summarize my PDFs",
  "Search my database for recent records",
  "What's in my chat logs?",
  "What can I ask this assistant?",
];

// "/" command menu — always-available discovery, deterministic (UI-driven,
// not LLM-generated), so it's never wrong about what actually exists.
// "/scenario" (Skill 2) intentionally left out — it's scaffold-only on the
// backend and not validated for real use yet. List can be reworked freely
// as more commands/adjustments come in.
interface SlashCommand {
  command: string;
  label: string;
  description: string;
}

// Floating alias to Google's current-recommended flash model — survives
// Gemini version transitions (unlike a pinned name such as "gemini-2.5-flash",
// which 404s on API keys/projects created after Google's cutoff for it).
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

// The composer's top edge is a transparent-to-opaque gradient (its `pt-12`).
// Text resting in that band is still legible, so the thread doesn't reserve
// the whole band — trimming it keeps the resting gap from looking empty.
const COMPOSER_FADE_ALLOWANCE = 40;

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/gap-check", label: "Gap Check", description: "Jalankan Compliance Gap Check (Skill 1)" },
  { command: "/collections", label: "Collections", description: "Lihat daftar collection dokumen kamu" },
  { command: "/history", label: "History", description: "Lihat riwayat gap-analysis run sebelumnya" },
  { command: "/upload", label: "Upload", description: "Upload dokumen baru" },
  { command: "/help", label: "Help", description: "Lihat semua command yang tersedia" },
];

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
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(!!initialSessionId);
  const sources = useSourceInventory();
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>(
    DEFAULT_GEMINI_MODEL,
  );
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The composer floats over the thread, so the thread reserves room for it.
  // Its height isn't fixed — the toolbar chips wrap on narrow widths, zoom, or
  // larger font sizes — so measure it instead of hardcoding the gap, otherwise
  // the last lines end up stuck behind it.
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const { toast } = useToast();
  const sessionIdRef = useRef<string | undefined>(initialSessionId);
  // In-flight "create session" request — lets concurrent saveSession() calls
  // (e.g. two replies landing close together) share one create instead of
  // each racing a separate POST without session_id, which forks a duplicate
  // session row in history.
  const sessionCreateRef = useRef<Promise<string | undefined> | null>(null);
  // Guards the pendingQuestion effect against double-firing for the same
  // value (e.g. React Strict Mode's dev double-invoke), which would submit
  // the same question twice and save it as two separate sessions.
  const pendingQuestionHandledRef = useRef<string | null>(null);

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
  const [gapAnalysisOpen, setGapAnalysisOpen] = useState(false);

  useEffect(() => {
    // Only load the models list for the dropdown — do NOT override selectedProvider/selectedModel
    // so our DEFAULT_GEMINI_MODEL default is always preserved.
    AvailableModelsApi.get<AvailableModelsResponse>()
      .then((data) => setAvailableModels(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Re-runs on sessionLoading because the composer isn't mounted during the
  // restore state, so there'd be nothing to observe on the first pass.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setComposerHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [sessionLoading]);

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
      sources.toggles.pdf ? "pdf" : null,
      sources.toggles.db ? "database" : null,
      sources.toggles.chat ? "chat" : null,
      sources.toggles.link ? "public_link" : null,
    ].filter(Boolean) as Array<"pdf" | "database" | "chat" | "public_link">;

    if (enabled.length === 0) return "none" as const;
    if (enabled.length === 1) return enabled[0];
    return "mixed" as const;
  };

  const buildRequest = (question: string): HybridQueryRequest => {
    // Each *_ids field is left undefined on purpose: the backend already
    // resolves "active" items per source type (same as Database/Public Link
    // activation) when no explicit ids are sent, so the active/inactive
    // toggles set in Sources are always respected without duplicating that
    // resolution logic here.
    return {
      question,
      include_pdf_results: sources.toggles.pdf,
      // The "DB" toggle queries the user's own connected database(s) from
      // Sources > Database — not the app's internal storage.
      include_external_db: sources.toggles.db,
      include_chat_results: sources.toggles.chat,
      include_public_links: sources.toggles.link,
      source_mode: deriveSourceMode(),
      llm_provider: selectedProvider,
      llm_model: selectedModel,
    };
  };

  const saveSession = async (msgs: typeof messages) => {
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

    // Already have a session id — save straight through.
    if (sessionIdRef.current) {
      payload.session_id = sessionIdRef.current;
      SessionsApi.store<SessionResponse>(
        payload as unknown as Record<string, unknown>,
      )
        .then((saved) => {
          if (saved?.session_id) sessionIdRef.current = saved.session_id;
        })
        .catch(() => {});
      return;
    }

    // No session id yet: only let ONE create request go out. Later callers
    // piggyback on the same in-flight create instead of racing their own.
    if (!sessionCreateRef.current) {
      sessionCreateRef.current = SessionsApi.store<SessionResponse>(
        payload as unknown as Record<string, unknown>,
      )
        .then((saved) => {
          sessionIdRef.current = saved?.session_id;
          return saved?.session_id;
        })
        .catch(() => undefined)
        .finally(() => {
          sessionCreateRef.current = null;
        });
      return;
    }

    const id = await sessionCreateRef.current;
    if (!id) return;
    SessionsApi.store<SessionResponse>(
      { ...payload, session_id: id } as unknown as Record<string, unknown>,
    )
      .then((saved) => {
        if (saved?.session_id) sessionIdRef.current = saved.session_id;
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

  /** Static/deterministic assistant message — used by "/" commands so the
   * reply is always accurate (backed by real API data or a fixed list),
   * never an LLM guessing about what features exist. */
  const appendStaticAssistantMessage = (content: string) => {
    setMessages((prev) => {
      const next = [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant" as const, content },
      ];
      setTimeout(() => saveSession(next), 0);
      return next;
    });
  };

  const runSlashCommand = (command: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: command },
    ]);
    setInput("");

    switch (command) {
      case "/gap-check":
        setGapAnalysisOpen(true);
        break;

      case "/upload":
        appendStaticAssistantMessage(
          "Upload dokumen baru lewat panel **Sources** di sidebar — pilih tab PDF/Chat/Database, lalu klik **Upload File**.",
        );
        break;

      case "/collections":
        PdfCollectionsApi.get<PdfCollection[]>()
          .then((data) => {
            const cols = Array.isArray(data) ? data : [];
            const body = cols.length
              ? cols
                  .map((c) => `- **${c.title || c.file_names?.[0] || c.collection_id}** — ${c.status ?? "active"}`)
                  .join("\n")
              : "Belum ada collection yang di-upload.";
            appendStaticAssistantMessage(`**Collection kamu:**\n\n${body}`);
          })
          .catch(() => appendStaticAssistantMessage("Gagal memuat daftar collection."));
        break;

      case "/history":
        GapAnalysisRunsApi.get<GapAnalysisRun[]>()
          .then((data) => {
            const runs = Array.isArray(data) ? data : [];
            const body = runs.length
              ? runs
                  .slice(0, 10)
                  .map(
                    (r) =>
                      `- **${r.framework_name}** (${r.skill_id}) — ${r.status}, ${new Date(r.created_at).toLocaleString()}`,
                  )
                  .join("\n")
              : "Belum ada riwayat gap-analysis run.";
            appendStaticAssistantMessage(`**Riwayat Gap Analysis:**\n\n${body}`);
          })
          .catch(() => appendStaticAssistantMessage("Gagal memuat riwayat run."));
        break;

      case "/help":
      default:
        appendStaticAssistantMessage(
          "**Command yang tersedia:**\n\n" +
            SLASH_COMMANDS.map((c) => `- \`${c.command}\` — ${c.description}`).join("\n"),
        );
        break;
    }
  };

  const runQuery = (question: string) => {
    // No source selected at all — answering anyway means the LLM gets an
    // empty context and either hallucinates or falls back to a misleading
    // "not found in documents" reply. Direct the user to pick a source
    // instead of pretending to search nothing. Centralized here (not just
    // in handleSubmit) so it also covers askSuggested and pendingQuestion.
    if (deriveSourceMode() === "none") {
      appendStaticAssistantMessage(
        "Pilih dulu minimal satu sumber (PDF, Database, Chat, atau Drive) di toolbar sebelum bertanya, biar jawabannya bisa saya dasarkan dari data kamu.",
      );
      return;
    }
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

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const regenerateMessage = (assistantId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx <= 0) return;
    const precedingUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!precedingUser) return;

    // Same "no source selected" guard as runQuery — regenerate calls the API
    // directly, so it needs its own check instead of inheriting runQuery's.
    if (deriveSourceMode() === "none") {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Pilih dulu minimal satu sumber (PDF, Database, Chat, atau Drive) di toolbar sebelum bertanya, biar jawabannya bisa saya dasarkan dari data kamu.",
              }
            : m,
        );
        setTimeout(() => saveSession(next), 0);
        return next;
      });
      return;
    }

    setRegeneratingId(assistantId);
    HybridQueryApi.store<HybridResponse>(
      buildRequest(precedingUser.content) as unknown as Record<string, unknown>,
    )
      .then((data: HybridResponse) => {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
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
                }
              : m,
          );
          setTimeout(() => saveSession(next), 0);
          return next;
        });
      })
      .catch(() =>
        toast({
          title: "Error",
          description: "Regenerate failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => setRegeneratingId(null));
  };

  useEffect(() => {
    if (!pendingQuestion?.trim()) return;
    if (pendingQuestionHandledRef.current === pendingQuestion) return;
    pendingQuestionHandledRef.current = pendingQuestion;
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

  const filteredCommands = input.startsWith("/")
    ? SLASH_COMMANDS.filter(
        (c) =>
          c.command.toLowerCase().startsWith(input.toLowerCase()) ||
          c.label.toLowerCase().includes(input.slice(1).toLowerCase()),
      )
    : [];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    // Only intercept as a slash command when it actually matches one of the
    // known commands — otherwise a message that merely starts with "/" (a
    // typo'd command, a path, a real question) falls through and sends
    // normally instead of silently vanishing.
    if (input.startsWith("/") && filteredCommands.length > 0) {
      runSlashCommand(filteredCommands[0].command);
      return;
    }
    // Starts with "/" but matches no known command — treat as an attempted
    // (mistyped) command, not a real question. Answering it through the LLM
    // pipeline produces a confusing generic off-topic reply; show the
    // command list instantly instead, no backend call needed.
    if (input.startsWith("/") && filteredCommands.length === 0) {
      const attempted = input.trim();
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: attempted },
      ]);
      setInput("");
      appendStaticAssistantMessage(
        `Command \`${attempted}\` tidak dikenali.\n\n**Command yang tersedia:**\n\n` +
          SLASH_COMMANDS.map((c) => `- \`${c.command}\` — ${c.description}`).join("\n"),
      );
      return;
    }
    if (!input.trim()) return;
    const question = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: question },
    ]);
    setInput("");
    runQuery(question);
  };

  const askSuggested = (question: string) => {
    if (loading) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: question },
    ]);
    runQuery(question);
  };

  const hasConversation = messages.length > 0;

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
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div
            className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 w-full flex flex-col space-y-8 pb-48"
            style={{
              paddingBottom: composerHeight
                ? composerHeight - COMPOSER_FADE_ALLOWANCE
                : undefined,
            }}
          >
            {!hasConversation ? (
              <div className="relative flex flex-col items-center justify-center py-16 sm:py-24 text-center">
                {/* Ambient orbs (matches hero/landing page glow language) — empty state only, never behind an active thread */}
                <div className="fixed top-24 right-[12%] w-64 h-64 rounded-full bg-primary/[0.07] blur-[90px] pointer-events-none z-0" />
                <div className="fixed bottom-20 left-[8%] w-80 h-80 rounded-full bg-primary/[0.05] blur-[110px] pointer-events-none z-0" />
                <div className="relative mb-5 p-5 rounded-2xl bg-muted/40 border border-border/50">
                  <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
                </div>
                <h2 className="relative font-['Manrope'] text-xl font-bold text-foreground mb-2">Ask anything about your documents</h2>
                <p className="relative text-muted-foreground font-['Inter'] max-w-sm text-sm mb-6">Search across PDFs, databases, and chat logs using natural language</p>
                <div className="relative flex items-center justify-center gap-2 flex-wrap max-w-lg">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => askSuggested(q)}
                      className="text-xs font-['Manrope'] font-bold text-foreground bg-card border border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] hover:border-primary/40 hover:bg-accent transition-all px-3.5 py-2 rounded-full"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/50 font-['Inter'] mt-5">
                  Ketik <span className="font-mono font-semibold">/</span> di kolom chat untuk lihat command (Gap Check, Collections, History, dll)
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <section key={message.id} className="space-y-6">
                  {message.role === "user" && (
                    <div className="flex items-start justify-end gap-3">
                      <div className="max-w-[75%] bg-muted rounded-2xl px-5 py-3">
                        <p className="font-['Inter'] text-base text-foreground leading-snug">
                          {message.content}
                        </p>
                      </div>
                      <Avatar className="mt-1 w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary">
                          <span className="material-symbols-outlined text-sm">person</span>
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  {message.role === "assistant" && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-primary mb-1">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        <span className="text-[11px] font-bold tracking-[0.2em] uppercase font-['Manrope']">Synthesized Intelligence</span>
                      </div>
                      <div className="font-['Inter'] text-base text-foreground leading-relaxed prose prose-neutral dark:prose-invert max-w-none prose-headings:font-['Manrope'] prose-headings:text-foreground prose-strong:text-foreground prose-li:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => copyMessage(message.content)}
                          title="Copy"
                          aria-label="Copy message"
                          className="w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => regenerateMessage(message.id)}
                          disabled={regeneratingId === message.id}
                          title="Regenerate"
                          aria-label="Regenerate response"
                          className="w-7 h-7 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                        >
                          {regeneratingId === message.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {message.modelUsed && (
                          <span className="text-[11px] font-bold font-['Manrope'] uppercase tracking-[0.2em] text-muted-foreground/50">{message.modelUsed}</span>
                        )}
                        {message.sources?.processing_time && (
                          <span className="text-[10px] text-muted-foreground/40">{message.sources.processing_time.toFixed(2)}s</span>
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
                <div className="bg-card rounded-2xl px-5 py-3.5 border border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
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
        <div
          ref={composerRef}
          className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-4 sm:pb-6 pt-12 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-30"
        >
          <div className="max-w-3xl mx-auto pointer-events-auto space-y-2">
            {/* Toolbar row */}
            <div className="flex items-center gap-2 px-1 flex-wrap gap-y-2">
              {/* Source toggles */}
              <div className="flex items-center gap-1 flex-wrap">
                <SourceChip
                  label="Files"
                  icon="description"
                  active={sources.toggles.pdf}
                  count={sources.pdf.activeIds.length}
                  items={sources.pdf.activeNames}
                  onToggle={() => sources.toggle("pdf")}
                />
                <SourceChip
                  label="DB"
                  icon="database"
                  active={sources.toggles.db}
                  count={sources.db.activeIds.length}
                  items={sources.db.activeNames}
                  onToggle={() => sources.toggle("db")}
                />
                <SourceChip
                  label="Chat"
                  icon="chat_bubble"
                  active={sources.toggles.chat}
                  count={sources.chat.activeIds.length}
                  items={sources.chat.activeNames}
                  onToggle={() => sources.toggle("chat")}
                />
                <SourceChip
                  label="Drive"
                  icon="link"
                  active={sources.toggles.link}
                  count={sources.link.activeIds.length}
                  items={sources.link.activeNames}
                  onToggle={() => sources.toggle("link")}
                />
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                {/* Gap Analysis skill trigger — opt-in, doesn't change default chat flow */}
                <button
                  onClick={() => setGapAnalysisOpen(true)}
                  title="Compliance Gap Check"
                  className="flex items-center gap-1.5 bg-muted hover:bg-accent transition-colors rounded-full px-2.5 py-1 text-[11px] font-bold font-['Manrope'] text-muted-foreground hover:text-foreground"
                >
                  <span className="material-symbols-outlined text-[12px] leading-none">shield</span>
                  Gap Check
                </button>
                {/* Model selector */}
                <div className="relative flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 hover:bg-accent transition-colors">
                  <span className="material-symbols-outlined text-[12px] text-muted-foreground">smart_toy</span>
                  <select
                    value={`${selectedProvider}::${selectedModel}`}
                    onChange={(e) => {
                      const [provider, model] = e.target.value.split("::");
                      setSelectedProvider(provider as LLMProvider);
                      setSelectedModel(model);
                    }}
                    className="appearance-none text-[11px] font-bold font-['Manrope'] text-muted-foreground bg-transparent border-none outline-none cursor-pointer max-w-[130px] pr-4"
                  >
                    {(
                      availableModels?.available_models?.["gemini"] ?? [
                        DEFAULT_GEMINI_MODEL,
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
                  <ChevronDown className="h-3 w-3 text-muted-foreground/60 absolute right-2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Input row */}
            <div className="relative">
              {filteredCommands.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] overflow-hidden z-40">
                  {filteredCommands.map((cmd, idx) => (
                    <button
                      key={cmd.command}
                      onClick={() => runSlashCommand(cmd.command)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-accent transition-colors ${
                        idx === 0 ? "bg-accent/50" : ""
                      }`}
                    >
                      <span className="text-sm font-['Manrope'] font-semibold text-foreground">
                        {cmd.command}
                      </span>
                      <span className="text-xs text-muted-foreground font-['Inter'] text-right">
                        {cmd.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className={`flex items-center bg-card border rounded-2xl p-2 gap-2 transition-all duration-200 ${
                input ? "border-primary/30 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]" : "border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
              }`}>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && filteredCommands.length > 0) {
                      setInput("");
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Ask a follow-up, or type “/” for commands…"
                  className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-sm font-['Inter'] text-foreground placeholder:text-muted-foreground/40 py-3 h-auto px-2"
                />
                <Button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(74,124,255,0.3)] hover:shadow-[0_6px_18px_rgba(74,124,255,0.4)] transition-all disabled:opacity-30 disabled:shadow-none"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PdfViewerDialog
        open={pdfViewer.open}
        onOpenChange={(open) => setPdfViewer((prev) => ({ ...prev, open }))}
        pdfUrl={pdfViewer.pdfUrl}
        fileName={pdfViewer.fileName}
        initialPage={pdfViewer.page}
        searchText={pdfViewer.searchText}
        contentPreview={pdfViewer.contentPreview}
      />

      <GapAnalysisDialog open={gapAnalysisOpen} onOpenChange={setGapAnalysisOpen} />
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
    <div className="pl-1">
      <p className="text-[11px] font-bold font-['Manrope'] uppercase tracking-[0.2em] text-muted-foreground/50 mb-2">
        Sources
      </p>
      <div className="flex flex-wrap gap-2">
      {hasPdfDetailed && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
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
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
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
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
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
            <button className="group flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-['Manrope'] font-bold text-muted-foreground hover:text-foreground w-auto">
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
                  {chat.participants && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {chat.participants}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground line-clamp-3 italic">{chat.content_preview}</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      </div>
    </div>
  );
}
