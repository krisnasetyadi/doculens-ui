"use client";

import { useState, useRef, useEffect } from "react";
import { HybridQueryApi } from "@/services/resources/hybrid-query-api";
import { AvailableModelsApi } from "@/services/resources/available-models-api";
import { SessionsApi } from "@/services/resources/sessions-api";
import { PdfCollectionApi } from "@/services/resources/pdf-collection-api";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import { PaymentApi } from "@/services/resources/payment-api";
import { useToast } from "@/hooks/use-toast";
import { useSourceInventory, type SourceKey } from "@/hooks/use-source-inventory";
import { useWorkspaceStore } from "@/stores/workspace-store";
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
  RateLimitStatus,
  MemberTokenUsage,
  MyMemberUsageResponse,
} from "@/services";
import {
  DEFAULT_GEMINI_MODEL,
  SLASH_COMMANDS,
  filterSlashCommands,
  type Message,
  type PdfViewerState,
} from "@/components/workspace/chat-interface/chat-types";

interface UseChatThreadOptions {
  selectedPdfCollections?: string[];
  selectedChatCollections?: string[];
  selectedPublicLinkIds?: string[];
  selectedDbConnectionIds?: string[];
  pendingQuestion?: string;
  onPendingQuestionConsumed?: () => void;
  initialSessionId?: string; // load an existing session from backend
}

/** Owns every piece of state and business logic for a chat thread — session
 * persistence, running queries, slash commands, regeneration — so
 * ChatInterface itself only has to worry about layout/rendering. */
export function useChatThread({
  selectedPdfCollections = [],
  selectedChatCollections = [],
  selectedPublicLinkIds = [],
  selectedDbConnectionIds = [],
  pendingQuestion,
  onPendingQuestionConsumed,
  initialSessionId,
}: UseChatThreadOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(!!initialSessionId);
  const sources = useSourceInventory();
  const bumpSessionsVersion = useWorkspaceStore((s) => s.bumpSessionsVersion);
  const setActiveSessionId = useWorkspaceStore((s) => s.setActiveSessionId);
  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>(
    DEFAULT_GEMINI_MODEL,
  );
  const [availableModels, setAvailableModels] =
    useState<AvailableModelsResponse | null>(null);
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
  // Keeps the ref (used for API calls) and the store (a read-only signal the
  // sidebar checks before deleting) in sync in one place — never touches the
  // URL/router, so it can never trigger a navigation or Suspense re-fetch.
  const setSessionId = (id: string | undefined) => {
    sessionIdRef.current = id;
    setActiveSessionId(id ?? null);
  };

  // Load existing session from backend
  useEffect(() => {
    if (!initialSessionId) {
      // initialSessionId went back to empty (e.g. navigated to bare /ask
      // via the "Workspace" nav item) — clear out whatever was loaded
      // before, so the view and activeSessionId don't stay stuck on it.
      if (sessionIdRef.current) {
        setMessages([]);
        setSessionId(undefined);
      }
      return;
    }
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
        setSessionId(data.session_id);
      })
      .catch(() => {
        toast({ title: "Could not load session", variant: "destructive" });
      })
      .finally(() => setSessionLoading(false));
  }, [initialSessionId]);

  // Clear the "active session" signal once this chat view goes away, so a
  // delete elsewhere doesn't act on a stale session id.
  useEffect(() => {
    return () => setActiveSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pdfViewer, setPdfViewer] = useState<PdfViewerState>({
    open: false,
    pdfUrl: "",
    fileName: "",
  });
  const [gapAnalysisOpen, setGapAnalysisOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

  // Flat safety-net rate limit (MS-248 follow-up) — checked proactively so
  // the composer can disable itself before a blocked send round-trips to
  // the backend just to 429. Refreshed on mount, after every query
  // settles (to catch a request that just tipped the user over the cap),
  // and periodically while blocked (so it clears on its own once the
  // sliding window ages out, without the user needing to retry manually).
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const refreshRateLimit = () => {
    PaymentApi.getRateLimitStatus<RateLimitStatus>()
      .then(setRateLimit)
      .catch(() => {});
  };

  useEffect(() => {
    refreshRateLimit();
  }, []);

  useEffect(() => {
    if (!rateLimit?.blocked) return;
    const interval = setInterval(refreshRateLimit, 20_000);
    return () => clearInterval(interval);
  }, [rateLimit?.blocked]);

  // Per-member allocation (admin-assigned cap, MS-248 follow-up) — a
  // second, independent way to be blocked, distinct from the flat safety
  // net above: this one doesn't self-clear on a timer, only when the
  // admin raises the allocation, so "Request more tokens" (below) is the
  // way out rather than just waiting.
  const [myUsage, setMyUsage] = useState<MemberTokenUsage | null>(null);
  const refreshMyUsage = () => {
    PaymentApi.getMyUsage<MyMemberUsageResponse>()
      .then((res) => setMyUsage(res.usage))
      .catch(() => {});
  };

  useEffect(() => {
    refreshMyUsage();
  }, []);

  const isMemberCapped = Boolean(
    myUsage && myUsage.allocated_tokens > 0 && myUsage.remaining_tokens <= 0,
  );

  useEffect(() => {
    if (!isMemberCapped) return;
    // Slower poll than the flat rate limit's — this only changes when the
    // admin acts, not on its own, so there's no urgency to catch it fast.
    const interval = setInterval(refreshMyUsage, 30_000);
    return () => clearInterval(interval);
  }, [isMemberCapped]);

  const [requestingMoreTokens, setRequestingMoreTokens] = useState(false);
  const [tokenRequestSent, setTokenRequestSent] = useState(false);

  function requestMoreTokens() {
    setRequestingMoreTokens(true);
    PaymentApi.requestMoreTokens()
      .then(() => {
        setTokenRequestSent(true);
        toast({
          title: "Request terkirim",
          description: "Admin kamu akan lihat request ini di tab Billing.",
          variant: "success",
        });
      })
      .catch((err: unknown) => {
        toast({
          title: "Gagal mengirim request",
          description: err instanceof Error ? err.message : "Coba lagi nanti.",
          variant: "destructive",
        });
      })
      .finally(() => setRequestingMoreTokens(false));
  }

  useEffect(() => {
    // Only load the models list for the dropdown — do NOT override selectedProvider/selectedModel
    // so our DEFAULT_GEMINI_MODEL default is always preserved.
    AvailableModelsApi.get<AvailableModelsResponse>()
      .then((data) => setAvailableModels(data))
      .catch(() => {});
  }, []);

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
    // Reads the store directly (not `sources.toggles`) so a toggle set moments
    // earlier in the same call — e.g. askSuggested's setActiveOnly — is picked
    // up immediately, instead of the stale value from this render's closure.
    const toggles = useWorkspaceStore.getState().sourceToggles;
    const enabled = [
      toggles.pdf ? "pdf" : null,
      toggles.db ? "database" : null,
      toggles.chat ? "chat" : null,
      toggles.link ? "public_link" : null,
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
    const toggles = useWorkspaceStore.getState().sourceToggles;
    return {
      question,
      include_pdf_results: toggles.pdf,
      // The "DB" toggle queries the user's own connected database(s) from
      // Sources > Database — not the app's internal storage.
      include_external_db: toggles.db,
      include_chat_results: toggles.chat,
      include_public_links: toggles.link,
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

    // Persist to backend DB only — no localStorage. title is added below
    // only for the create path — once a session exists, its title (whether
    // still the auto-derived one or since renamed) is left for the backend
    // to keep as-is.
    const payload: UpsertSessionRequest = {
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
          if (saved?.session_id) setSessionId(saved.session_id);
        })
        .catch(() => {});
      return;
    }

    // No session id yet: only let ONE create request go out. Later callers
    // piggyback on the same in-flight create instead of racing their own.
    if (!sessionCreateRef.current) {
      sessionCreateRef.current = SessionsApi.store<SessionResponse>(
        { ...payload, title } as unknown as Record<string, unknown>,
      )
        .then((saved) => {
          setSessionId(saved?.session_id);
          if (saved?.session_id) bumpSessionsVersion();
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
        if (saved?.session_id) setSessionId(saved.session_id);
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

      case "/usage":
        setUsageOpen(true);
        break;

      case "/upload":
        appendStaticAssistantMessage(
          "Upload dokumen baru lewat panel **Sources** di sidebar — pilih tab PDF/Chat/Database, lalu klik **Upload File**.",
        );
        break;

      case "/collections":
        PdfCollectionApi.list<PdfCollection[]>()
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
        GapAnalysisApi.listRuns<GapAnalysisRun[]>()
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
    // Rate limit hit — don't even round-trip to the backend just to 429.
    if (rateLimit?.blocked) {
      appendStaticAssistantMessage(
        "Batas token kamu untuk saat ini sudah tercapai. Coba lagi setelah beberapa saat — ini reset otomatis, tidak perlu hubungi admin.",
      );
      return;
    }
    // Admin-assigned cap hit — doesn't self-clear, direct them to ask for more.
    if (isMemberCapped) {
      appendStaticAssistantMessage(
        "Batas penggunaan token untuk periode ini telah tercapai. Klik “Request more tokens” di bawah, atau buka /usage.",
      );
      return;
    }
    setLoading(true);
    HybridQueryApi.store<HybridResponse>(
      buildRequest(question) as unknown as Record<string, unknown>,
    )
      .then((data: HybridResponse) => appendAssistantMessage(data))
      .catch((err: unknown) =>
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Query failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        setLoading(false);
        refreshRateLimit();
        refreshMyUsage();
      });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", variant: "success" });
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

    if (rateLimit?.blocked) {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Batas token kamu untuk saat ini sudah tercapai. Coba lagi setelah beberapa saat — ini reset otomatis, tidak perlu hubungi admin.",
              }
            : m,
        );
        setTimeout(() => saveSession(next), 0);
        return next;
      });
      return;
    }

    if (isMemberCapped) {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Batas penggunaan token untuk periode ini telah tercapai. Klik “Request more tokens” di bawah, atau buka /usage.",
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
      .catch((err: unknown) =>
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Regenerate failed. Please try again.",
          variant: "destructive",
        }),
      )
      .finally(() => {
        setRegeneratingId(null);
        refreshRateLimit();
        refreshMyUsage();
      });
  };

  useEffect(() => {
    if (!pendingQuestion?.trim()) return;
    if (pendingQuestionHandledRef.current === pendingQuestion) return;
    pendingQuestionHandledRef.current = pendingQuestion;
    const trimmed = pendingQuestion.trim();
    onPendingQuestionConsumed?.();
    // A "/" command selected before ChatInterface mounted (e.g. from the
    // Home hero input) arrives here as pendingQuestion — route it through
    // the same handler as a command picked from the active composer.
    if (SLASH_COMMANDS.some((c) => c.command === trimmed)) {
      runSlashCommand(trimmed);
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
      },
    ]);
    runQuery(trimmed);
  }, [pendingQuestion]);

  const filteredCommands = filterSlashCommands(input);

  const handleSubmit = () => {
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

  const askSuggested = (question: string, sourceKey?: SourceKey) => {
    if (loading) return;
    // Each suggested question implies a single source ("Summarize my PDFs" →
    // PDFs only); the general question has no sourceKey and leaves whatever
    // the user last had toggled on untouched.
    if (sourceKey) sources.setActiveOnly(sourceKey);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: question },
    ]);
    runQuery(question);
  };

  const handleModelChange = (provider: LLMProvider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  const hasConversation = messages.length > 0;

  return {
    // Thread state
    messages,
    hasConversation,
    loading,
    regeneratingId,
    sessionLoading,

    // Composer state
    input,
    setInput,
    filteredCommands,
    sources,
    selectedProvider,
    selectedModel,
    availableModels,
    onModelChange: handleModelChange,

    // Dialogs
    pdfViewer,
    setPdfViewer,
    gapAnalysisOpen,
    setGapAnalysisOpen,
    usageOpen,
    setUsageOpen,
    rateLimit,
    myUsage,
    isMemberCapped,
    requestMoreTokens,
    requestingMoreTokens,
    tokenRequestSent,

    // Actions
    handleSubmit,
    askSuggested,
    runSlashCommand,
    copyMessage,
    regenerateMessage,
    openPdfViewer,
  };
}

export type ChatThread = ReturnType<typeof useChatThread>;
