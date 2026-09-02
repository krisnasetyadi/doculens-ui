"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { HybridQueryApi } from "@/services/resources/hybrid-query-api";
import { AvailableModelsApi } from "@/services/resources/available-models-api";
import { SessionsApi } from "@/services/resources/sessions-api";
import { PdfCollectionApi } from "@/services/resources/pdf-collection-api";
import { GapAnalysisApi } from "@/services/resources/gap-analysis-api";
import { useToast } from "@/hooks/use-toast";
import { useSourceInventory, type SourceKey } from "@/hooks/use-source-inventory";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type {
  HybridResponse,
  HybridQueryRequest,
  AvailableModelsResponse,
  LLMProvider,
  MemoryTurn,
  PdfSourceInfo,
  SessionResponse,
  SessionQuestion,
  SessionQuestionsResponse,
  UpsertSessionRequest,
  PdfCollection,
  GapAnalysisRun,
} from "@/services";
import {
  DEFAULT_GEMINI_MODEL,
  MEMORY_CHATS,
  PAGE_CHATS,
  QUESTION_PREVIEW_LENGTH,
  TOC_MIN_CHATS,
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
  // MS-237: `messages` holds only what's actually been fetched — the most
  // recent page on session load, plus whatever loadOlder()/revealTurn() has
  // prepended since. hasMoreOlder/nextCursor mirror GET /sessions/{id}'s own
  // has_more/next_cursor. totalUserTurns is the true count of questions —
  // i.e. of chats — in the whole session (loaded or not); ChatToc needs it
  // to divide the thread across its bars, including the stretches it hasn't
  // fetched yet.
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadOlderError, setLoadOlderError] = useState(false);
  const [totalUserTurns, setTotalUserTurns] = useState(0);
  // MS-237: the navigation index behind ChatToc's hover panel — one short
  // line per question in the whole session, fetched in a single request the
  // first time the panel is opened rather than on load, since most sessions
  // are never navigated. Independent of `messages`: the panel lists
  // questions the thread hasn't paged in yet, which is the whole point of it.
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  // Which session the index above was fetched for — so it's fetched once
  // per session, and refetched after switching to a different one.
  const questionsFetchedForRef = useRef<string | null>(null);
  // Synchronous mutex for the pagination fetch — `loadingOlder` (React state)
  // is what the UI reads, but it updates on the next render, not
  // immediately. Two calls to loadOlder()/revealTurn() landing in the same
  // tick (e.g. the IntersectionObserver firing again before a re-render)
  // would both see the same stale `false` and both start a fetch. This ref
  // is set/checked synchronously, so only one fetch is ever in flight.
  const loadingOlderRef = useRef(false);
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
        setHasMoreOlder(false);
        setNextCursor(null);
        setLoadOlderError(false);
        setTotalUserTurns(0);
        setQuestions([]);
        questionsFetchedForRef.current = null;
        setSessionId(undefined);
      }
      return;
    }
    setSessionLoading(true);
    setLoadOlderError(false);
    setQuestions([]);
    questionsFetchedForRef.current = null;
    // Only the most recent page (poin 2, 10) — a long-restored history
    // opens instantly instead of the old "fetch every message, always".
    SessionsApi.find<SessionResponse>(initialSessionId, { limit: PAGE_CHATS })
      .then((data) => {
        const restored: Message[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          modelUsed: m.model_used,
        }));
        setMessages(restored);
        setHasMoreOlder(data.has_more);
        setNextCursor(data.next_cursor);
        setTotalUserTurns(data.total_user_turns);
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

  /** MS-237 poin 1: the previous `MEMORY_CHATS` chats before `beforeIndex`
   * (defaults to the end of `messages`, i.e. "before whatever is about to be
   * asked"). A chat is one question plus the answer that came back, so the
   * cut is made at the 5th-from-last question and everything after it comes
   * along — slicing a flat 5 messages instead would routinely hand the model
   * an answer whose question got left behind. Static replies (slash
   * commands, "pick a source" nudges) are skipped — they're not real
   * conversation and would just burn tokens; identifiable by `modelUsed`
   * being unset, which also holds after a session restore since the server
   * persists that same field. */
  const buildMemory = (beforeIndex?: number): MemoryTurn[] => {
    const upTo = beforeIndex ?? messages.length;
    const eligible = messages
      .slice(0, upTo)
      .filter((m) => m.role === "user" || !!m.modelUsed);
    const questionAt = eligible.reduce<number[]>((acc, m, i) => {
      if (m.role === "user") acc.push(i);
      return acc;
    }, []);
    const start =
      questionAt.length > MEMORY_CHATS ? questionAt[questionAt.length - MEMORY_CHATS] : 0;
    return eligible.slice(start).map((m) => ({ role: m.role, content: m.content }));
  };

  const buildRequest = (question: string, memoryBeforeIndex?: number): HybridQueryRequest => {
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
      session_id: sessionIdRef.current ?? null,
      memory: buildMemory(memoryBeforeIndex),
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
    // Generated once per call, not inside the updater below — React's dev
    // Strict Mode invokes state-updater functions twice to catch impurity,
    // and a fresh Date.now()-based id on each of those two invocations could
    // land in different milliseconds, producing two distinct message_ids
    // for what's logically one reply. Both invocations then schedule a save
    // with a different id, and both get persisted as separate DB rows —
    // invisible locally (React only commits one), but both real rows once a
    // reload re-fetches from the server. A stable id here means the two
    // saves (if both fire) upsert the same row instead.
    const newId = (Date.now() + 1).toString();
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: newId,
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
    // Same fixed-id-outside-the-updater reasoning as appendAssistantMessage.
    const newId = (Date.now() + 1).toString();
    setMessages((prev) => {
      const next = [
        ...prev,
        { id: newId, role: "assistant" as const, content },
      ];
      setTimeout(() => saveSession(next), 0);
      return next;
    });
  };

  /** Appends a user-authored message and keeps totalUserTurns in lockstep —
   * every user-role message counts toward it (slash commands included,
   * matching how the server counts role='user' rows), so ChatToc's chat
   * count never drifts from what a fresh reload would report. */
  const appendUserMessage = (content: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content }]);
    setTotalUserTurns((t) => t + 1);
  };

  const runSlashCommand = (command: string) => {
    appendUserMessage(command);
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

    setRegeneratingId(assistantId);
    HybridQueryApi.store<HybridResponse>(
      // Memory window ends right before precedingUser — the same messages
      // the original answer would have seen, not polluted by anything
      // asked after it.
      buildRequest(precedingUser.content, messages.indexOf(precedingUser)) as unknown as Record<string, unknown>,
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
    const trimmed = pendingQuestion.trim();
    onPendingQuestionConsumed?.();
    // A "/" command selected before ChatInterface mounted (e.g. from the
    // Home hero input) arrives here as pendingQuestion — route it through
    // the same handler as a command picked from the active composer.
    if (SLASH_COMMANDS.some((c) => c.command === trimmed)) {
      runSlashCommand(trimmed);
      return;
    }
    appendUserMessage(trimmed);
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
      appendUserMessage(attempted);
      setInput("");
      appendStaticAssistantMessage(
        `Command \`${attempted}\` tidak dikenali.\n\n**Command yang tersedia:**\n\n` +
          SLASH_COMMANDS.map((c) => `- \`${c.command}\` — ${c.description}`).join("\n"),
      );
      return;
    }
    if (!input.trim()) return;
    const question = input.trim();
    appendUserMessage(question);
    setInput("");
    runQuery(question);
  };

  const askSuggested = (question: string, sourceKey?: SourceKey) => {
    if (loading) return;
    // Each suggested question implies a single source ("Summarize my PDFs" →
    // PDFs only); the general question has no sourceKey and leaves whatever
    // the user last had toggled on untouched.
    if (sourceKey) sources.setActiveOnly(sourceKey);
    appendUserMessage(question);
    runQuery(question);
  };

  const handleModelChange = (provider: LLMProvider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };

  const hasConversation = messages.length > 0;

  /** Fetch the whole session's question index — one small request. Marked
   * as fetched before the request goes out so a mouse crossing the rail
   * repeatedly can't queue several; the mark is released again on failure
   * so a retry (the effect below, or another hover) can pick it up. */
  const loadQuestions = () => {
    const id = sessionIdRef.current;
    if (!id || questionsFetchedForRef.current === id) return;
    questionsFetchedForRef.current = id;
    setQuestionsLoading(true);
    SessionsApi.find<SessionQuestionsResponse>(`${id}/questions`)
      .then((data) => setQuestions(data.questions ?? []))
      .catch(() => {
        questionsFetchedForRef.current = null;
      })
      .finally(() => setQuestionsLoading(false));
  };

  // Fetch as soon as the rail is going to render (same threshold ChatToc
  // uses to decide whether to show itself at all) rather than waiting for
  // the first hover — a hover-triggered fetch means the panel's first open
  // sits on a network round-trip, showing only whatever's already loaded in
  // the thread until it resolves, then visibly growing once it does. Firing
  // this early means that gap is usually already closed by the time anyone
  // actually hovers. Re-runs on every new question, but loadQuestions()
  // itself is a no-op past the first successful fetch per session.
  useEffect(() => {
    if (totalUserTurns >= TOC_MIN_CHATS) loadQuestions();
  }, [totalUserTurns]);

  /** What the navigation panel actually renders: the fetched index, with
   * every question currently loaded in the thread laid over it. The overlay
   * matters in both directions — a question asked seconds ago isn't in the
   * index yet (it may not even be persisted), and after a long scroll back
   * the thread holds text for turns the index has capped away. Turns nothing
   * knows the text of are left out rather than listed as blanks; the rail's
   * bars still reach them. */
  const questionIndex = useMemo(() => {
    const byTurn = new Map<number, { turn: number; preview: string }>();
    for (const q of questions) {
      byTurn.set(q.turn, { turn: q.turn, preview: q.preview });
    }
    const loadedQuestions = messages.filter((m) => m.role === "user");
    const firstLoadedTurn = totalUserTurns - loadedQuestions.length + 1;
    loadedQuestions.forEach((m, i) => {
      const turn = firstLoadedTurn + i;
      if (turn < 1) return;
      byTurn.set(turn, {
        turn,
        preview: m.content.slice(0, QUESTION_PREVIEW_LENGTH),
      });
    });
    return [...byTurn.values()].sort((a, b) => a.turn - b.turn);
  }, [questions, messages, totalUserTurns]);

  /** Fetch one older page — no state writes, just data, so both loadOlder()
   * (a scroll, always one page of PAGE_CHATS) and revealTurn() (a jump,
   * which asks for however many chats it has to cross in one request rather
   * than walking there five at a time) can share it without racing each
   * other's state updates. `chats` is clamped to the 100 the endpoint
   * allows. */
  const fetchOlderPage = (cursor: string | null, chats: number = PAGE_CHATS) =>
    SessionsApi.find<SessionResponse>(sessionIdRef.current as string, {
      limit: Math.min(100, Math.max(PAGE_CHATS, chats)),
      ...(cursor ? { before: cursor } : {}),
    }).then((data) => ({
      messages: data.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        modelUsed: m.model_used,
      })) as Message[],
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
    }));

  /** Scroll-triggered (poin 3, 4, 5): fetch the next page of older messages
   * and prepend them. Safe to call from multiple triggers (sentinel,
   * Retry button) — loadingOlderRef is the actual mutex; hasMoreOlder just
   * decides whether there's anything worth fetching. */
  const loadOlder = () => {
    if (loadingOlderRef.current || !hasMoreOlder || !sessionIdRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setLoadOlderError(false);
    fetchOlderPage(nextCursor)
      .then((page) => {
        setMessages((prev) => [...page.messages, ...prev]);
        setHasMoreOlder(page.hasMore);
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        setLoadOlderError(true);
      })
      .finally(() => {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      });
  };

  /** ChatToc-triggered (poin 5): `turnIndex` is 1-based, counting from
   * the very first question ever asked in this session. The currently
   * loaded window always covers the most recent `loadedUserCount` turns —
   * i.e. turns (totalUserTurns - loadedUserCount + 1) .. totalUserTurns —
   * so if the target falls before that, keep paging older until it's
   * covered, commit everything fetched in one go, then resolve and return
   * its real message id (or null if the count was stale and it doesn't
   * exist) for the caller to scroll to. Already-loaded targets resolve
   * immediately with zero fetches. */
  const revealTurn = async (turnIndex: number): Promise<string | null> => {
    if (!sessionIdRef.current) return null;
    // Shares loadingOlderRef with loadOlder() — they compete for the same
    // "one pagination fetch at a time" resource, so a ChatToc jump can't
    // race a scroll-triggered load (or another jump) into firing together.
    if (loadingOlderRef.current) return null;
    let loadedUserCount = messages.filter((m) => m.role === "user").length;
    let cursor = nextCursor;
    let more = hasMoreOlder;
    let accumulated: Message[] = [];

    if (totalUserTurns - loadedUserCount + 1 > turnIndex) {
      loadingOlderRef.current = true;
      setLoadingOlder(true);
      setLoadOlderError(false);
      try {
        while (totalUserTurns - loadedUserCount + 1 > turnIndex && more) {
          // Ask for exactly the gap that's left in one request. A bar in
          // ChatToc covers a slice of the whole conversation, so the very
          // first one always points at chat 1 — crossing there five chats
          // per request would mean dozens of round-trips on a long session.
          const page = await fetchOlderPage(
            cursor,
            totalUserTurns - loadedUserCount + 1 - turnIndex,
          );
          accumulated = [...page.messages, ...accumulated];
          loadedUserCount += page.messages.filter((m) => m.role === "user").length;
          cursor = page.nextCursor;
          more = page.hasMore;
        }
      } catch {
        toast({ title: "Gagal memuat pesan sebelumnya", variant: "destructive" });
      } finally {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
    }

    if (accumulated.length) {
      setMessages((prev) => [...accumulated, ...prev]);
      setHasMoreOlder(more);
      setNextCursor(cursor);
    }

    const combined = [...accumulated, ...messages];
    const userMsgs = combined.filter((m) => m.role === "user");
    const firstLoadedTurnNumber = totalUserTurns - loadedUserCount + 1;
    return userMsgs[turnIndex - firstLoadedTurnNumber]?.id ?? null;
  };

  return {
    // Thread state
    messages,
    hasMoreOlder,
    loadingOlder,
    loadOlderError,
    loadOlder,
    totalUserTurns,
    revealTurn,
    questionIndex,
    questionsLoading,
    loadQuestions,
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
